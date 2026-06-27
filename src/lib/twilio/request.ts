import "server-only";

import type { NextRequest } from "next/server";

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
    return true;
  }

  const signature = input.request.headers.get("x-twilio-signature");

  if (!signature) {
    return true;
  }

  return validateTwilioRequestSignature({
    authToken,
    signature,
    url: input.request.url,
    params: input.params,
  });
}
