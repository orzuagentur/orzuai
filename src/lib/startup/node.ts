import "server-only";

let startupPromise: Promise<void> | null = null;

export function scheduleNodeStartup(): void {
  if (startupPromise) {
    return;
  }

  startupPromise = (async () => {
    const [
      { probeRedisCacheOnStartup },
      { ensureSecretsCacheWarm },
      { warmPlatformAiRuntimeCache },
    ] = await Promise.all([
      import("@/lib/cache/redis"),
      import("@/lib/secrets/warm-cache"),
      import("@/lib/ai/platform-api-keys"),
    ]);

    await Promise.all([
      probeRedisCacheOnStartup(),
      ensureSecretsCacheWarm(),
      warmPlatformAiRuntimeCache().catch((error) => {
        console.warn("[startup] platform AI cache warm failed", error);
      }),
    ]);
  })().catch((error) => {
    startupPromise = null;
    console.warn("[startup] node initialization failed", error);
  });
}
