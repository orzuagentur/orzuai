import { createHmac, timingSafeEqual } from "crypto";

export function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function signStreamToken(input: {
  businessId: string;
  callSid: string;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(`${input.businessId}:${input.callSid}`)
    .digest("base64url");
}

export function verifyStreamToken(input: {
  businessId: string;
  callSid: string;
  secret: string;
  token: string | null | undefined;
}): boolean {
  const provided = input.token?.trim();
  if (!provided) {
    return false;
  }

  const expected = signStreamToken({
    businessId: input.businessId,
    callSid: input.callSid,
    secret: input.secret,
  });

  const left = Buffer.from(provided);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export type VoiceStreamContext = {
  businessId: string;
  businessName: string;
  language: string;
  languageCode?: string;
  voiceId: string;
  openingLine: string;
  errorPrompt: string;
  repeatPrompt: string;
  direction: "inbound" | "outbound";
  triggerReason: string | null;
  deepgramLanguage: string;
};

export type VoiceStreamReplyResult = {
  text: string;
  endCall?: boolean;
};

export async function fetchVoiceStreamContext(input: {
  appUrl: string;
  secret: string;
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
}): Promise<VoiceStreamContext> {
  const url = new URL(`${input.appUrl}/api/internal/voice-stream/context`);
  url.searchParams.set("businessId", input.businessId);
  url.searchParams.set("callSid", input.callSid);
  url.searchParams.set("direction", input.direction);
  if (input.triggerReason) {
    url.searchParams.set("triggerReason", input.triggerReason);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.secret}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Context fetch failed (${response.status})`);
  }

  return (await response.json()) as VoiceStreamContext;
}

export async function requestVoiceStreamReply(input: {
  appUrl: string;
  secret: string;
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  userMessage: string;
  triggerReason?: string | null;
}): Promise<VoiceStreamReplyResult> {
  const response = await fetch(`${input.appUrl}/api/internal/voice-stream/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId: input.businessId,
      callSid: input.callSid,
      direction: input.direction,
      userMessage: input.userMessage,
      triggerReason: input.triggerReason ?? null,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reply fetch failed (${response.status})`);
  }

  return (await response.json()) as VoiceStreamReplyResult;
}

export async function notifyVoiceStreamLifecycle(input: {
  appUrl: string;
  secret: string;
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  event: "start" | "stop";
  triggerReason?: string | null;
}): Promise<void> {
  await fetch(`${input.appUrl}/api/internal/voice-stream/lifecycle`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId: input.businessId,
      callSid: input.callSid,
      direction: input.direction,
      event: input.event,
      triggerReason: input.triggerReason ?? null,
    }),
    cache: "no-store",
  }).catch((error) => {
    console.warn(
      "[voice-stream] lifecycle notify failed",
      error instanceof Error ? error.message : "unknown",
    );
  });
}

export async function appendVoiceStreamTurn(input: {
  appUrl: string;
  secret: string;
  businessId: string;
  callSid: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  await fetch(`${input.appUrl}/api/internal/voice-stream/turn`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  }).catch((error) => {
    console.warn(
      "[voice-stream] turn append failed",
      error instanceof Error ? error.message : "unknown",
    );
  });
}
