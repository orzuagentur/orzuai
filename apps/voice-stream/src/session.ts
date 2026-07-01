import type WebSocket from "ws";

import {
  fetchVoiceStreamContext,
  notifyVoiceStreamLifecycle,
  requestVoiceStreamReply,
  verifyStreamToken,
  type VoiceStreamContext,
} from "./config.js";
import { startDeepgramLive } from "./deepgram.js";
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
  elevenLabsApiKey: string;
  deepgramApiKey: string;
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
  private isSpeaking = false;
  private isProcessing = false;
  private pendingTranscript = "";
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
      apiKey: this.options.deepgramApiKey,
      language: this.context.deepgramLanguage,
      onSpeechStarted: () => {
        void this.handleBargeIn();
      },
      onFinalTranscript: (text) => {
        this.queueTranscript(text);
      },
      onError: (message) => {
        console.error("[voice-stream] deepgram live failed", message);
      },
    });

    await this.speak(this.context.openingLine);
  }

  private handleMedia(message: TwilioStreamMedia): void {
    if (!this.deepgram || message.media.track !== "inbound") {
      return;
    }

    this.deepgram.sendAudio(message.media.payload);
  }

  private queueTranscript(text: string): void {
    this.pendingTranscript = `${this.pendingTranscript} ${text}`.trim();

    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
    }

    this.transcriptTimer = setTimeout(() => {
      const combined = this.pendingTranscript.trim();
      this.pendingTranscript = "";
      this.transcriptTimer = null;

      if (combined) {
        void this.processUserMessage(combined);
      }
    }, 350);
  }

  private async handleBargeIn(): Promise<void> {
    if (!this.isSpeaking || !this.streamSid) {
      return;
    }

    this.speechAbort?.abort();
    this.speechAbort = null;
    this.isSpeaking = false;
    sendTwilioClear(this.ws, this.streamSid);
  }

  private async processUserMessage(userMessage: string): Promise<void> {
    if (this.isProcessing || !this.context || !this.businessId || !this.callSid) {
      return;
    }

    this.isProcessing = true;

    try {
      const reply = await requestVoiceStreamReply({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        userMessage,
        triggerReason: this.triggerReason,
      });

      await this.speak(reply.text);

      if (reply.endCall) {
        this.ws.close();
      }
    } catch (error) {
      console.error(
        "[voice-stream] process message failed",
        error instanceof Error ? error.message : "unknown",
      );

      const fallback =
        this.context.errorPrompt?.trim() ||
        "Sorry, something went wrong. Could you please repeat that?";

      await this.speak(fallback);
    } finally {
      this.isProcessing = false;
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
        apiKey: this.options.elevenLabsApiKey,
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
