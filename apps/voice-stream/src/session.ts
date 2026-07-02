import type WebSocket from "ws";

import {
  fetchVoiceStreamContext,
  notifyVoiceStreamLifecycle,
  requestVoiceStreamReplyStream,
  verifyStreamToken,
  appendVoiceStreamTurn,
  type VoiceStreamContext,
} from "./config.js";
import { startDeepgramLive } from "./deepgram.js";
import { extractCompleteSentences } from "./sentences.js";
import {
  sendTwilioClear,
  streamElevenLabsUlawToTwilio,
  type TwilioStreamMedia,
  type TwilioStreamStart,
  type TwilioStreamStop,
} from "./twilio.js";

type VoiceStreamSessionOptions = {
  ws: WebSocket;
  appUrl: string;
  streamSecret: string;
  getElevenLabsApiKey: () => string;
  getDeepgramApiKey: () => string;
};

export class VoiceStreamSession {
  private readonly ws: WebSocket;
  private readonly options: VoiceStreamSessionOptions;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private businessId: string | null = null;
  private direction: "inbound" | "outbound" = "inbound";
  private triggerReason: string | null = null;
  private context: VoiceStreamContext | null = null;
  private deepgram: ReturnType<typeof startDeepgramLive> | null = null;
  private speechAbort: AbortController | null = null;
  private replyAbort: AbortController | null = null;
  private isSpeaking = false;
  private isProcessing = false;
  private pendingTranscript = "";
  private queuedUserMessage: string | null = null;
  private transcriptTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(options: VoiceStreamSessionOptions) {
    this.options = options;
    this.ws = options.ws;
  }

  async handleMessage(raw: string): Promise<void> {
    const message = JSON.parse(raw) as
      | TwilioStreamStart
      | TwilioStreamMedia
      | TwilioStreamStop
      | { event: string };

    switch (message.event) {
      case "start":
        await this.handleStart(message as TwilioStreamStart);
        break;
      case "media":
        this.handleMedia(message as TwilioStreamMedia);
        break;
      case "stop":
        await this.handleStop();
        break;
      default:
        break;
    }
  }

  private async handleStart(message: TwilioStreamStart): Promise<void> {
    try {
      this.streamSid = message.start.streamSid;
      this.callSid = message.start.callSid;
      const params = message.start.customParameters ?? {};
      this.businessId = params.businessId?.trim() || null;
      this.direction = params.direction === "outbound" ? "outbound" : "inbound";
      this.triggerReason = params.triggerReason?.trim() || null;

      if (!this.businessId || !this.callSid) {
        console.error("[voice-stream] missing businessId or callSid");
        this.ws.close();
        return;
      }

      if (
        !verifyStreamToken({
          businessId: this.businessId,
          callSid: this.callSid,
          secret: this.options.streamSecret,
          token: params.streamToken,
        })
      ) {
        console.error("[voice-stream] invalid stream token");
        this.ws.close();
        return;
      }

      this.context = await fetchVoiceStreamContext({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        triggerReason: this.triggerReason,
      });

      await notifyVoiceStreamLifecycle({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        event: "start",
        triggerReason: this.triggerReason,
      });

      this.deepgram = startDeepgramLive({
        apiKey: this.options.getDeepgramApiKey(),
        language: this.context.deepgramLanguage,
        onSpeechStarted: () => {
          void this.handleBargeIn();
        },
        onFinalTranscript: (text, options) => {
          this.queueTranscript(text, options?.speechFinal ?? false);
        },
        onError: (message) => {
          console.error("[voice-stream] deepgram live failed", message);
        },
      });

      await this.speak(this.context.openingLine);

      if (this.businessId && this.callSid && this.context.openingLine.trim()) {
        void appendVoiceStreamTurn({
          appUrl: this.options.appUrl,
          secret: this.options.streamSecret,
          businessId: this.businessId,
          callSid: this.callSid,
          role: "assistant",
          content: this.context.openingLine,
        });
      }
    } catch (error) {
      console.error(
        "[voice-stream] handleStart failed",
        error instanceof Error ? error.message : "unknown",
      );
      this.ws.close();
    }
  }

  private handleMedia(message: TwilioStreamMedia): void {
    if (!this.deepgram || message.media.track !== "inbound") {
      return;
    }

    this.deepgram.sendAudio(message.media.payload);
  }

  private queueTranscript(text: string, speechFinal = false): void {
    this.pendingTranscript = `${this.pendingTranscript} ${text}`.trim();

    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
      this.transcriptTimer = null;
    }

    const flush = () => {
      const combined = this.pendingTranscript.trim();
      this.pendingTranscript = "";
      this.transcriptTimer = null;

      if (combined) {
        void this.processUserMessage(combined);
      }
    };

    if (speechFinal) {
      flush();
      return;
    }

    this.transcriptTimer = setTimeout(flush, 120);
  }

  private async handleBargeIn(): Promise<void> {
    if (!this.isSpeaking || !this.streamSid) {
      return;
    }

    this.speechAbort?.abort();
    this.speechAbort = null;
    this.replyAbort?.abort();
    this.isSpeaking = false;
    sendTwilioClear(this.ws, this.streamSid);
  }

  private async processUserMessage(userMessage: string): Promise<void> {
    if (this.isProcessing) {
      this.queuedUserMessage = userMessage;
      return;
    }

    if (!this.context || !this.businessId || !this.callSid) {
      return;
    }

    this.isProcessing = true;
    this.replyAbort = new AbortController();
    const replyAbort = this.replyAbort;

    try {
      let sentenceBuffer = "";
      let endCall = false;

      for await (const chunk of requestVoiceStreamReplyStream({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        userMessage,
        triggerReason: this.triggerReason,
        abortSignal: replyAbort.signal,
      })) {
        if (chunk.type === "delta") {
          sentenceBuffer += chunk.text;
          const { sentences, remainder } =
            extractCompleteSentences(sentenceBuffer);
          sentenceBuffer = remainder;

          for (const sentence of sentences) {
            await this.speak(sentence);
          }
          continue;
        }

        const trailing = sentenceBuffer.trim();
        if (trailing) {
          await this.speak(trailing);
        }

        endCall = Boolean(chunk.endCall);
      }

      if (endCall) {
        this.ws.close();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error(
        "[voice-stream] process message failed",
        error instanceof Error ? error.message : "unknown",
      );

      const fallback =
        this.context.errorPrompt?.trim() ||
        "Sorry, something went wrong. Could you please repeat that?";

      await this.speak(fallback);
    } finally {
      if (this.replyAbort === replyAbort) {
        this.replyAbort = null;
      }
      this.isProcessing = false;

      if (this.queuedUserMessage) {
        const nextMessage = this.queuedUserMessage;
        this.queuedUserMessage = null;
        void this.processUserMessage(nextMessage);
      }
    }
  }

  private async speak(text: string): Promise<void> {
    if (!this.streamSid || !this.context || this.closed) {
      return;
    }

    this.speechAbort?.abort();
    this.speechAbort = new AbortController();
    this.isSpeaking = true;

    try {
      await streamElevenLabsUlawToTwilio({
        ws: this.ws,
        streamSid: this.streamSid,
        apiKey: this.options.getElevenLabsApiKey(),
        voiceId: this.context.voiceId,
        text,
        languageCode: this.context.languageCode,
        abortSignal: this.speechAbort.signal,
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error(
          "[voice-stream] speak failed",
          error instanceof Error ? error.message : "unknown",
        );
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  private async handleStop(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.businessId && this.callSid) {
      await notifyVoiceStreamLifecycle({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        event: "stop",
        triggerReason: this.triggerReason,
      });
    }

    this.deepgram?.close();
    this.speechAbort?.abort();
  }

  close(): void {
    void this.handleStop();
  }
}
