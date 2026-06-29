import "server-only";

import type { NextRequest } from "next/server";

import { buildAppUrl } from "@/lib/app-url";
import { validateTwilioRequestSignature } from "@/lib/twilio/validate-request";

export async function readTwilioRequestParams(
  request: NextRequest,
): Promise<Record<string, string>> {
  if (request.method === "GET") {
    return Object.fromEntries(request.nextUrl.searchParams.entries());
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  return params;
}

export function isTwilioWebhookSignatureValid(input: {
  request: NextRequest;
  params: Record<string, string>;
  authToken: string | null | undefined;
}): boolean {
  const authToken = input.authToken?.trim();

  if (!authToken) {
    return isSignatureValidationBypassedForLocalDevelopment();
  }

  const signature = input.request.headers.get("x-twilio-signature");

  if (!signature) {
    return isSignatureValidationBypassedForLocalDevelopment();
  }

  for (const url of getTwilioSignatureUrlCandidates(input.request)) {
    if (
      validateTwilioRequestSignature({
        authToken,
        signature,
        url,
        params: input.params,
      })
    ) {
      return true;
    }
  }

  return false;
}

function isSignatureValidationBypassedForLocalDevelopment(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.TWILIO_DISABLE_SIGNATURE_VALIDATION === "true"
  );
}

function getTwilioSignatureUrlCandidates(request: NextRequest): string[] {
  const candidates = new Set<string>();
  const pathAndSearch = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  candidates.add(request.url);

  const canonicalUrl = buildAppUrl(pathAndSearch);
  if (canonicalUrl) {
    candidates.add(canonicalUrl);
  }

  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers.get("host")?.trim();

  for (const candidateHost of [forwardedHost, host]) {
    if (candidateHost) {
      candidates.add(`${forwardedProto}://${candidateHost}${pathAndSearch}`);
    }
  }

  return [...candidates].filter(Boolean);
}
