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

const MONITOR_TOKEN_TTL_SECONDS = 300;

export type MonitorTokenClaims = {
  businessId: string;
  callSid: string;
  callLogId: string;
  exp: number;
};

export function signMonitorToken(input: {
  businessId: string;
  callSid: string;
  callLogId: string;
  secret: string;
  ttlSeconds?: number;
}): string {
  const exp =
    Math.floor(Date.now() / 1000) +
    (input.ttlSeconds ?? MONITOR_TOKEN_TTL_SECONDS);
  const payload = [
    input.businessId.trim(),
    input.callSid.trim(),
    input.callLogId.trim(),
    String(exp),
  ].join(":");

  const signature = createHmac("sha256", input.secret)
    .update(payload)
    .digest("base64url");

  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifyMonitorToken(
  token: string | null | undefined,
  secret: string,
): MonitorTokenClaims | null {
  const raw = token?.trim();
  if (!raw) {
    return null;
  }

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const payloadB64 = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length !== 4) {
    return null;
  }

  const [businessId, callSid, callLogId, expRaw] = parts;
  const exp = Number.parseInt(expRaw ?? "", 10);

  if (!businessId || !callSid || !callLogId || !Number.isFinite(exp)) {
    return null;
  }

  if (exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { businessId, callSid, callLogId, exp };
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
  systemPrompt?: string;
  llmModel?: string;
  llmProvider?: string;
  openaiApiKey?: string | null;
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

export type VoiceStreamReplyStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; text: string; endCall?: boolean };

export async function* requestVoiceStreamReplyStream(input: {
  appUrl: string;
  secret: string;
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  userMessage: string;
  triggerReason?: string | null;
  abortSignal?: AbortSignal;
}): AsyncGenerator<VoiceStreamReplyStreamEvent, void, void> {
  const response = await fetch(
    `${input.appUrl}/api/internal/voice-stream/reply/stream`,
    {
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
      signal: input.abortSignal,
    },
  );

  if (!response.ok || !response.body) {
    throw new Error(`Reply stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const chunk = JSON.parse(trimmed) as VoiceStreamReplyStreamEvent;
      yield chunk;
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    yield JSON.parse(trailing) as VoiceStreamReplyStreamEvent;
  }
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
