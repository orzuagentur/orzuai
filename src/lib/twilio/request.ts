import "server-only";

import type { NextRequest } from "next/server";

import { buildAppUrl } from "@/lib/app-url";
import { validateTwilioRequestSignature } from "@/lib/twilio/validate-request";
import { isOrzuSignedTwilioWebhookValid } from "@/lib/twilio/webhook-token";

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
  businessId?: string | null;
  expectedAccountSid?: string | null;
  allowedAccountSids?: string[] | null;
}): boolean {
  const authToken = input.authToken?.trim();
  const businessId = input.businessId?.trim();
  const receivedAccountSid = input.params.AccountSid?.trim();
  const localBypass = isSignatureValidationBypassedForLocalDevelopment();
  const requestMethod = input.request.method.toUpperCase();
  const allowedAccountSids = [
    ...new Set(
      [
        ...(input.allowedAccountSids ?? []),
        input.expectedAccountSid,
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  if (
    allowedAccountSids.length > 0 &&
    receivedAccountSid &&
    !allowedAccountSids.includes(receivedAccountSid)
  ) {
    logTwilioSignatureFailure(input.request, {
      businessId,
      accountSid: receivedAccountSid,
      reason: "account_sid_mismatch",
    });
    return false;
  }

  const orzuSigned = isOrzuSignedRequestValid(input.request, businessId);

  if (!authToken) {
    if (orzuSigned || localBypass) {
      return true;
    }

    logTwilioSignatureFailure(input.request, {
      businessId,
      accountSid: receivedAccountSid,
      reason: "missing_auth_token",
    });
    return false;
  }

  const signature = input.request.headers.get("x-twilio-signature");

  if (!signature) {
    if (orzuSigned || localBypass) {
      return true;
    }

    logTwilioSignatureFailure(input.request, {
      businessId,
      accountSid: receivedAccountSid,
      reason: "missing_twilio_signature",
    });
    return false;
  }

  // Twilio GET callbacks sign only the full URL. POST signs URL + body params.
  // Re-appending query params for GET breaks validation.
  const signatureParams = requestMethod === "GET" ? {} : input.params;

  for (const url of getTwilioSignatureUrlCandidates(input.request)) {
    if (
      validateTwilioRequestSignature({
        authToken,
        signature,
        url,
        params: signatureParams,
      })
    ) {
      return true;
    }
  }

  if (orzuSigned) {
    console.warn(
      "[twilio-webhook] X-Twilio-Signature failed; accepted orzuSig fallback",
      JSON.stringify({
        businessId: businessId ?? null,
        path: input.request.nextUrl.pathname,
        accountSid: receivedAccountSid ?? null,
        method: requestMethod,
      }),
    );
    return true;
  }

  logTwilioSignatureFailure(input.request, {
    businessId,
    accountSid: receivedAccountSid,
    reason: "twilio_signature_failed",
  });

  return localBypass;
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

  addUrlCandidate(candidates, request.url);

  const canonicalUrl = buildAppUrl(pathAndSearch);
  if (canonicalUrl) {
    addUrlCandidate(candidates, canonicalUrl);
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
      addUrlCandidate(
        candidates,
        `${forwardedProto}://${candidateHost}${pathAndSearch}`,
      );
    }
  }

  return [...candidates].filter(Boolean);
}

function addUrlCandidate(candidates: Set<string>, url: string): void {
  if (!url) {
    return;
  }

  candidates.add(url);

  try {
    const parsed = new URL(url);
    const host = parsed.host;

    if (host.startsWith("www.")) {
      parsed.host = host.slice(4);
      candidates.add(parsed.toString());
      return;
    }

    parsed.host = `www.${host}`;
    candidates.add(parsed.toString());
  } catch {
    // Ignore malformed candidate URLs.
  }
}

function logTwilioSignatureFailure(
  request: NextRequest,
  input: {
    businessId?: string | null;
    accountSid?: string | null;
    reason: string;
  },
): void {
  console.warn(
    "[twilio-webhook] signature validation failed",
    JSON.stringify({
      businessId: input.businessId ?? null,
      path: request.nextUrl.pathname,
      accountSid: input.accountSid ?? null,
      reason: input.reason,
    }),
  );
}

function isOrzuSignedRequestValid(
  request: NextRequest,
  businessId: string | null | undefined,
): boolean {
  if (!businessId) {
    return false;
  }

  return isOrzuSignedTwilioWebhookValid({
    businessId,
    signature: request.nextUrl.searchParams.get("orzuSig"),
    version: request.nextUrl.searchParams.get("orzuSigVersion"),
    method: request.method,
    pathname: request.nextUrl.pathname,
  });
}
