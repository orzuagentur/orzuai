import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export function getClientIpFromHeaders(headerStore: Headers): string | null {
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return headerStore.get("x-real-ip")?.trim() ?? null;
}

export async function getRequestLoginContext(): Promise<{
  userAgent: string;
  ipAddress: string | null;
}> {
  const headerStore = await headers();

  return {
    userAgent: headerStore.get("user-agent") ?? "",
    ipAddress: getClientIpFromHeaders(headerStore),
  };
}

export function getLoginContextFromRequest(request: NextRequest): {
  userAgent: string;
  ipAddress: string | null;
} {
  return {
    userAgent: request.headers.get("user-agent") ?? "",
    ipAddress: getClientIpFromHeaders(request.headers),
  };
}
