import "server-only";

import { Redis } from "@upstash/redis";

import { ENV_KEYS } from "@/constants/env-keys";

let redisClient: Redis | null = null;
let redisUnavailable = false;

function getRedisClient(): Redis | null {
  if (redisUnavailable) {
    return null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisUnavailable = true;
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }

  return redisClient;
}

export function isRedisCacheEnabled(): boolean {
  return Boolean(
    process.env[ENV_KEYS.UPSTASH_REDIS_REST_URL]?.trim() &&
      process.env[ENV_KEYS.UPSTASH_REDIS_REST_TOKEN]?.trim(),
  );
}

export async function getRedisCacheValue(key: string): Promise<string | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get<string>(key);
    return typeof value === "string" ? value : null;
  } catch (error) {
    console.error("[redis-cache] get failed", error);
    return null;
  }
}

export async function setRedisCacheValue(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("[redis-cache] set failed", error);
  }
}

export function buildMediaUrlRedisKey(storagePath: string): string {
  return `media:url:${storagePath}`;
}
