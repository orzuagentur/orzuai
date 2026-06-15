export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { probeRedisCacheOnStartup } = await import("@/lib/cache/redis");
  await probeRedisCacheOnStartup();
}
