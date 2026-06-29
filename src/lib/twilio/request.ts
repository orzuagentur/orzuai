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

  const rawUrlValid = validateTwilioRequestSignature({
    authToken,
    signature,
    url: input.request.url,
    params: input.params,
  });

  if (rawUrlValid) {
    return true;
  }

  const canonicalUrl = buildAppUrl(
    `${input.request.nextUrl.pathname}${input.request.nextUrl.search}`,
  );

  if (!canonicalUrl || canonicalUrl === input.request.url) {
    return false;
  }

  return validateTwilioRequestSignature({
    authToken,
    signature,
    url: canonicalUrl,
    params: input.params,
  });
}

function isSignatureValidationBypassedForLocalDevelopment(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.TWILIO_DISABLE_SIGNATURE_VALIDATION === "true"
  );
}
