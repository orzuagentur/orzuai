import { getEnv } from "./config.js";

export type RuntimeAiKeys = {
  elevenlabsApiKey: string;
  deepgramApiKey: string;
};

const REFRESH_INTERVAL_MS = 60_000;

function readEnvFallback(): RuntimeAiKeys | null {
  const elevenlabsApiKey = getEnv("ELEVENLABS_API_KEY");
  const deepgramApiKey = getEnv("DEEPGRAM_API_KEY");

  if (!elevenlabsApiKey || !deepgramApiKey) {
    return null;
  }

  return { elevenlabsApiKey, deepgramApiKey };
}

export class RuntimeAiKeyProvider {
  private keys: RuntimeAiKeys | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly appUrl: string,
    private readonly streamSecret: string,
  ) {}

  get elevenLabsApiKey(): string {
    const key = this.keys?.elevenlabsApiKey ?? readEnvFallback()?.elevenlabsApiKey;
    if (!key) {
      throw new Error("ElevenLabs API key is not configured.");
    }
    return key;
  }

  get deepgramApiKey(): string {
    const key = this.keys?.deepgramApiKey ?? readEnvFallback()?.deepgramApiKey;
    if (!key) {
      throw new Error("Deepgram API key is not configured.");
    }
    return key;
  }

  async refresh(): Promise<void> {
    try {
      const response = await fetch(
        `${this.appUrl.replace(/\/$/, "")}/api/internal/platform-ai/runtime-keys`,
        {
          headers: {
            Authorization: `Bearer ${this.streamSecret}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Runtime key fetch failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        elevenlabsApiKey?: string | null;
        deepgramApiKey?: string | null;
      };

      const elevenlabsApiKey = payload.elevenlabsApiKey?.trim();
      const deepgramApiKey = payload.deepgramApiKey?.trim();

      if (elevenlabsApiKey && deepgramApiKey) {
        this.keys = { elevenlabsApiKey, deepgramApiKey };
        console.info("[voice-stream] runtime AI keys refreshed from platform vault");
        return;
      }
    } catch (error) {
      console.warn(
        "[voice-stream] runtime key refresh failed, using env fallback",
        error instanceof Error ? error.message : "unknown",
      );
    }

    const fallback = readEnvFallback();
    if (fallback) {
      this.keys = fallback;
    }
  }

  async start(): Promise<void> {
    await this.refresh();

    if (!this.keys && !readEnvFallback()) {
      throw new Error(
        "No ElevenLabs/Deepgram keys configured. Add them in Admin → General API AI or set env vars.",
      );
    }

    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, REFRESH_INTERVAL_MS);
    this.refreshTimer.unref();
  }

  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
