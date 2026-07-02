import type WebSocket from "ws";

/** 0 = customer (inbound), 1 = AI (outbound) */
export const MONITOR_TRACK_INBOUND = 0;
export const MONITOR_TRACK_OUTBOUND = 1;

const MAX_MONITORS_PER_CALL = 3;
const MAX_MONITOR_WS_BUFFERED = 256 * 1024;

type MonitorSubscriber = {
  ws: WebSocket;
  businessId: string;
  callSid: string;
};

class VoiceMonitorHub {
  private readonly subscribers = new Map<string, Set<MonitorSubscriber>>();

  subscribe(input: {
    ws: WebSocket;
    businessId: string;
    callSid: string;
  }): { ok: true } | { ok: false; reason: string } {
    const callSid = input.callSid.trim();
    const bucket = this.subscribers.get(callSid) ?? new Set<MonitorSubscriber>();

    if (bucket.size >= MAX_MONITORS_PER_CALL) {
      return { ok: false, reason: "monitor_limit_reached" };
    }

    const subscriber: MonitorSubscriber = {
      ws: input.ws,
      businessId: input.businessId,
      callSid,
    };

    bucket.add(subscriber);
    this.subscribers.set(callSid, bucket);

    input.ws.on("close", () => {
      this.unsubscribe(subscriber);
    });

    return { ok: true };
  }

  private unsubscribe(subscriber: MonitorSubscriber): void {
    const bucket = this.subscribers.get(subscriber.callSid);
    if (!bucket) {
      return;
    }

    bucket.delete(subscriber);

    if (bucket.size === 0) {
      this.subscribers.delete(subscriber.callSid);
    }
  }

  publish(callSid: string, track: number, audio: Buffer): void {
    const bucket = this.subscribers.get(callSid.trim());
    if (!bucket || bucket.size === 0 || audio.byteLength === 0) {
      return;
    }

    const frame = Buffer.allocUnsafe(1 + audio.byteLength);
    frame[0] = track;
    audio.copy(frame, 1);

    for (const subscriber of bucket) {
      if (subscriber.ws.readyState !== subscriber.ws.OPEN) {
        continue;
      }

      if (subscriber.ws.bufferedAmount > MAX_MONITOR_WS_BUFFERED) {
        continue;
      }

      try {
        subscriber.ws.send(frame);
      } catch {
        // Drop frame if socket is closing.
      }
    }
  }

  closeAll(): void {
    for (const bucket of this.subscribers.values()) {
      for (const subscriber of bucket) {
        subscriber.ws.close();
      }
    }

    this.subscribers.clear();
  }
}

export const voiceMonitorHub = new VoiceMonitorHub();
