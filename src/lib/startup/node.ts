import "server-only";

let startupPromise: Promise<void> | null = null;

export function scheduleNodeStartup(): void {
  if (startupPromise) {
    return;
  }

  startupPromise = (async () => {
    const [{ probeRedisCacheOnStartup }, { ensureSecretsCacheWarm }] =
      await Promise.all([
        import("@/lib/cache/redis"),
        import("@/lib/secrets/warm-cache"),
      ]);

    await Promise.all([probeRedisCacheOnStartup(), ensureSecretsCacheWarm()]);
  })().catch((error) => {
    startupPromise = null;
    console.warn("[startup] node initialization failed", error);
  });
}
