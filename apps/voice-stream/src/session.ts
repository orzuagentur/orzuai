import type WebSocket from "ws";

import { TwilioOutboundAudioPacer } from "./audio-pacer.js";
import {
  fetchVoiceStreamContext,
  notifyVoiceStreamLifecycle,
  requestVoiceStreamReplyStream,
  verifyStreamToken,
  appendVoiceStreamTurn,
  type VoiceStreamContext,
} from "./config.js";
import { startDeepgramLive } from "./deepgram.js";
import {
  MONITOR_TRACK_INBOUND,
  MONITOR_TRACK_OUTBOUND,
  voiceMonitorHub,
} from "./monitor-hub.js";
import { extractSpeakablePhrases } from "./phrases.js";
import { buildConversationPrompt, streamOpenAiReply } from "./llm.js";
import {
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
  getOpenAiApiKey: () => string | null;
};

const TRANSCRIPT_INTERIM_DEBOUNCE_MS = 400;

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
  private audioPacer: TwilioOutboundAudioPacer | null = null;
  private speechAbort: AbortController | null = null;
  private replyAbort: AbortController | null = null;
  private isSpeaking = false;
  private isProcessing = false;
  private pendingTranscript = "";
  private lastFlushedTranscript = "";
  private queuedUserMessages: string[] = [];
  private pendingInboundAudio: string[] = [];
  private transcriptTimer: NodeJS.Timeout | null = null;
  private closed = false;
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

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

      this.audioPacer = new TwilioOutboundAudioPacer(this.ws, this.streamSid, {
        onOutboundFrame: (frame) => {
          if (this.callSid) {
            voiceMonitorHub.publish(
              this.callSid,
              MONITOR_TRACK_OUTBOUND,
              frame,
            );
          }
        },
      });

      const contextPromise = fetchVoiceStreamContext({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        triggerReason: this.triggerReason,
      });

      const lifecyclePromise = notifyVoiceStreamLifecycle({
        appUrl: this.options.appUrl,
        secret: this.options.streamSecret,
        businessId: this.businessId,
        callSid: this.callSid,
        direction: this.direction,
        event: "start",
        triggerReason: this.triggerReason,
      });

      this.context = await contextPromise;
      await lifecyclePromise;

      this.deepgram = startDeepgramLive({
        apiKey: this.options.getDeepgramApiKey(),
        language:
          this.context.deepgramLanguage?.trim() ||
          this.context.language?.trim() ||
          "multi",
        onSpeechStarted: () => {
          void this.handleBargeIn();
        },
        onUtteranceEnd: () => {
          this.flushTranscript(true);
        },
        onFinalTranscript: (text, options) => {
          this.queueTranscript(text, options?.speechFinal ?? false);
        },
        onError: (errorMessage) => {
          console.error("[voice-stream] deepgram live failed", errorMessage);
        },
      });

      this.flushPendingInboundAudio();

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
    if (message.media.track !== "inbound") {
      return;
    }

    if (!this.deepgram) {
      this.pendingInboundAudio.push(message.media.payload);
      return;
    }

    if (this.callSid) {
      voiceMonitorHub.publish(
        this.callSid,
        MONITOR_TRACK_INBOUND,
        Buffer.from(message.media.payload, "base64"),
      );
    }

    this.deepgram.sendAudio(message.media.payload);
  }

  private flushPendingInboundAudio(): void {
    if (!this.deepgram || this.pendingInboundAudio.length === 0) {
      return;
    }

    const buffered = this.pendingInboundAudio;
    this.pendingInboundAudio = [];

    for (const payload of buffered) {
      if (this.callSid) {
        voiceMonitorHub.publish(
          this.callSid,
          MONITOR_TRACK_INBOUND,
          Buffer.from(payload, "base64"),
        );
      }
      this.deepgram.sendAudio(payload);
    }
  }

  private queueTranscript(text: string, speechFinal = false): void {
    this.pendingTranscript = `${this.pendingTranscript} ${text}`.trim();

    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
      this.transcriptTimer = null;
    }

    if (speechFinal) {
      this.flushTranscript(true);
      return;
    }

    this.transcriptTimer = setTimeout(() => {
      this.flushTranscript(false);
    }, TRANSCRIPT_INTERIM_DEBOUNCE_MS);
  }

  private flushTranscript(force: boolean): void {
    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
      this.transcriptTimer = null;
    }

    const combined = this.pendingTranscript.trim();
    this.pendingTranscript = "";

    if (!combined) {
      return;
    }

    if (!force && combined === this.lastFlushedTranscript) {
      return;
    }

    this.lastFlushedTranscript = combined;
    void this.processUserMessage(combined);
  }

  private async handleBargeIn(): Promise<void> {
    if (!this.isSpeaking || !this.streamSid) {
      return;
    }

    this.speechAbort?.abort();
    this.speechAbort = null;
    this.replyAbort?.abort();
    this.isSpeaking = false;
    this.audioPacer?.clear();
    this.audioPacer?.reset();

    if (this.transcriptTimer) {
      clearTimeout(this.transcriptTimer);
      this.transcriptTimer = null;
    }

    this.pendingTranscript = "";
    this.lastFlushedTranscript = "";
  }

  private async processUserMessage(userMessage: string): Promise<void> {
    if (this.isProcessing) {
      this.queuedUserMessages.push(userMessage);
      return;
    }

    if (!this.context || !this.businessId || !this.callSid) {
      return;
    }

    this.isProcessing = true;
    this.replyAbort = new AbortController();
    const replyAbort = this.replyAbort;

    this.conversationHistory.push({ role: "user", content: userMessage });

    const openaiApiKey =
      this.context.openaiApiKey?.trim() ||
      this.options.getOpenAiApiKey()?.trim() ||
      null;
    const canUseLocalLlm =
      openaiApiKey &&
      this.context.systemPrompt?.trim() &&
      (this.context.llmProvider === "openai" || !this.context.llmProvider);

    try {
      let assistantText = "";
      let endCall = false;

      if (canUseLocalLlm) {
        void appendVoiceStreamTurn({
          appUrl: this.options.appUrl,
          secret: this.options.streamSecret,
          businessId: this.businessId,
          callSid: this.callSid,
          role: "user",
          content: userMessage,
        });

        let phraseBuffer = "";
        const model = this.context.llmModel?.trim() || "gpt-4o-mini";
        const userPrompt = buildConversationPrompt({
          history: this.conversationHistory.slice(0, -1),
          userMessage,
        });

        for await (const delta of streamOpenAiReply({
          apiKey: openaiApiKey,
          model,
          systemPrompt: this.context.systemPrompt!,
          userPrompt,
          abortSignal: replyAbort.signal,
        })) {
          if (replyAbort.signal.aborted) {
            break;
          }

          assistantText += delta;
          phraseBuffer += delta;
          const { phrases, remainder } = extractSpeakablePhrases(phraseBuffer);
          phraseBuffer = remainder;

          if (phrases.length > 0 && !replyAbort.signal.aborted) {
            await this.speak(phrases.join(" "), replyAbort.signal);
          }
        }

        const trailing = phraseBuffer.trim();
        if (trailing && !replyAbort.signal.aborted) {
          await this.speak(trailing, replyAbort.signal);
          assistantText = assistantText.trim() || trailing;
        }
      } else {
        let phraseBuffer = "";

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
          if (replyAbort.signal.aborted) {
            break;
          }

          if (chunk.type === "delta") {
            phraseBuffer += chunk.text;
            const { phrases, remainder } = extractSpeakablePhrases(phraseBuffer);
            phraseBuffer = remainder;

            if (phrases.length > 0) {
              await this.speak(phrases.join(" "), replyAbort.signal);
            }
            continue;
          }

          assistantText = chunk.text;
          endCall = Boolean(chunk.endCall);
          const trailing = phraseBuffer.trim();
          if (trailing && !replyAbort.signal.aborted) {
            await this.speak(trailing, replyAbort.signal);
          }
        }
      }

      const finalText = assistantText.trim();
      if (finalText) {
        this.conversationHistory.push({ role: "assistant", content: finalText });
        void appendVoiceStreamTurn({
          appUrl: this.options.appUrl,
          secret: this.options.streamSecret,
          businessId: this.businessId,
          callSid: this.callSid,
          role: "assistant",
          content: finalText,
        });
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

      if (this.queuedUserMessages.length > 0) {
        const nextMessage = this.queuedUserMessages.shift();
        if (nextMessage) {
          void this.processUserMessage(nextMessage);
        }
      }
    }
  }

  private async speak(text: string, abortSignal?: AbortSignal): Promise<void> {
    const trimmed = text.trim();

    if (!trimmed || !this.streamSid || !this.context || this.closed || !this.audioPacer) {
      return;
    }

    if (!abortSignal) {
      this.speechAbort?.abort();
      this.speechAbort = new AbortController();
      abortSignal = this.speechAbort.signal;
    }

    this.isSpeaking = true;

    try {
      await streamElevenLabsUlawToTwilio({
        ws: this.ws,
        streamSid: this.streamSid,
        apiKey: this.options.getElevenLabsApiKey(),
        voiceId: this.context.voiceId,
        text: trimmed,
        languageCode: this.context.languageCode,
        abortSignal,
        pacer: this.audioPacer,
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error(
          "[voice-stream] speak failed",
          error instanceof Error ? error.message : "unknown",
        );
      }
    } finally {
      if (!abortSignal.aborted) {
        this.isSpeaking = false;
      }
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
    this.audioPacer?.clear();
  }

  close(): void {
    void this.handleStop();
  }
}
