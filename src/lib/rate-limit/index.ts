import "server-only";

import { Redis } from "@upstash/redis";

import { NextResponse } from "next/server";

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

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
};

/**
 * Fixed-window rate limiter backed by Upstash Redis.
 *
 * Fails **open**: if Redis is not configured or the call errors, the request is
 * allowed. This keeps the app fully functional without Upstash while still
 * protecting public endpoints from abuse when Upstash is enabled.
 */
export async function checkRateLimit(input: {
  /** Stable identifier for the bucket, e.g. `widget-chat:<ip>`. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = input;
  const redis = getRedisClient();

  if (!redis) {
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }

  try {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    return {
      allowed: count <= limit,
      remaining,
      limit,
      resetSeconds: windowSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] check failed", error);
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }
}

/** Best-effort client IP extraction from proxy headers (Vercel/Cloudflare). */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 response with Retry-After for a blocked request. */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.resetSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}
