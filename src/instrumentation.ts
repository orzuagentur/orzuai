export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const [{ probeRedisCacheOnStartup }, { ensureSecretsCacheWarm }] =
    await Promise.all([
      import("@/lib/cache/redis"),
      import("@/lib/secrets/warm-cache"),
    ]);

  await Promise.all([probeRedisCacheOnStartup(), ensureSecretsCacheWarm()]);
}
