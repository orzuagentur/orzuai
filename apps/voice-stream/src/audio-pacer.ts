import type WebSocket from "ws";

/** 8 kHz μ-law: 160 bytes = 20 ms of audio per Twilio telephony frame. */
const FRAME_BYTES = 160;
const FRAME_INTERVAL_MS = 20;
const MAX_WS_BUFFERED_BYTES = 64 * 1024;

export class TwilioOutboundAudioPacer {
  private readonly ws: WebSocket;
  private readonly streamSid: string;
  private readonly onOutboundFrame?: (frame: Buffer) => void;
  private readonly frameQueue: Buffer[] = [];
  private drainTimer: NodeJS.Timeout | null = null;
  private draining = false;
  private aborted = false;
  private playbackTimestampMs = 0;

  constructor(
    ws: WebSocket,
    streamSid: string,
    options?: { onOutboundFrame?: (frame: Buffer) => void },
  ) {
    this.ws = ws;
    this.streamSid = streamSid;
    this.onOutboundFrame = options?.onOutboundFrame;
  }

  enqueue(audio: Uint8Array): void {
    if (this.aborted) {
      return;
    }

    for (let offset = 0; offset < audio.byteLength; offset += FRAME_BYTES) {
      const slice = audio.subarray(
        offset,
        Math.min(offset + FRAME_BYTES, audio.byteLength),
      );
      this.frameQueue.push(Buffer.from(slice));
    }

    this.ensureDraining();
  }

  clear(): void {
    this.aborted = true;
    this.frameQueue.length = 0;
    this.stopDraining();
    this.ws.send(JSON.stringify({ event: "clear", streamSid: this.streamSid }));
  }

  reset(): void {
    this.aborted = false;
    this.playbackTimestampMs = 0;
  }

  async drain(): Promise<void> {
    this.ensureDraining();

    while (!this.aborted) {
      if (this.frameQueue.length === 0) {
        await sleep(FRAME_INTERVAL_MS);
        if (this.frameQueue.length === 0 && !this.draining) {
          return;
        }
        continue;
      }

      await sleep(FRAME_INTERVAL_MS);
    }
  }

  private ensureDraining(): void {
    if (this.drainTimer || this.aborted) {
      return;
    }

    this.draining = true;
    this.drainTimer = setInterval(() => {
      void this.sendNextFrame();
    }, FRAME_INTERVAL_MS);
  }

  private stopDraining(): void {
    if (this.drainTimer) {
      clearInterval(this.drainTimer);
      this.drainTimer = null;
    }
    this.draining = false;
  }

  private async sendNextFrame(): Promise<void> {
    if (this.aborted || this.frameQueue.length === 0) {
      if (this.frameQueue.length === 0) {
        this.stopDraining();
      }
      return;
    }

    if (this.ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
      await waitForSocketDrain(this.ws, MAX_WS_BUFFERED_BYTES);
    }

    const frame = this.frameQueue.shift();
    if (!frame) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        event: "media",
        streamSid: this.streamSid,
        media: {
          payload: frame.toString("base64"),
          timestamp: String(this.playbackTimestampMs),
        },
      }),
    );

    this.onOutboundFrame?.(frame);

    this.playbackTimestampMs += FRAME_INTERVAL_MS;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSocketDrain(
  ws: WebSocket,
  threshold: number,
): Promise<void> {
  if (ws.bufferedAmount <= threshold) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const check = () => {
      if (ws.bufferedAmount <= threshold) {
        resolve();
        return;
      }

      setTimeout(check, 10);
    };

    check();
  });
}
