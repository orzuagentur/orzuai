import { getAppUrl } from "@/lib/env";

const MAX_SPEECH_CHARS = 480;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPEECH_CHARS);
}

export function mapVoiceLanguageToTwilioLocale(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.includes("ukrain")) {
    return "uk-UA";
  }

  if (normalized.includes("russ")) {
    return "ru-RU";
  }

  if (normalized.includes("german") || normalized === "de") {
    return "de-DE";
  }

  if (normalized.includes("spanish") || normalized === "es") {
    return "es-ES";
  }

  return "en-US";
}

export function buildGatherActionUrl(input: {
  businessId: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
}): string {
  const base = getAppUrl();
  const url = new URL(`${base}/api/webhooks/voice/gather`);
  url.searchParams.set("businessId", input.businessId);
  url.searchParams.set("direction", input.direction);

  if (input.triggerReason) {
    url.searchParams.set("triggerReason", input.triggerReason);
  }

  return url.toString();
}

export function buildSayAndGatherTwiml(input: {
  speech: string;
  gatherActionUrl: string;
  speechLocale: string;
  reprompt?: string;
}): string {
  const sayText = escapeXml(sanitizeForSpeech(input.speech));
  const reprompt = escapeXml(
    sanitizeForSpeech(input.reprompt ?? "I did not catch that. Please say that again."),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="${input.speechLocale}">${sayText}</Say>
  <Gather input="speech" action="${escapeXml(input.gatherActionUrl)}" method="POST" speechTimeout="auto" language="${input.speechLocale}" timeout="5">
    <Say voice="Polly.Joanna" language="${input.speechLocale}">${reprompt}</Say>
  </Gather>
  <Say voice="Polly.Joanna" language="${input.speechLocale}">Thank you for calling. Goodbye.</Say>
</Response>`;
}

export function buildStaticSayTwiml(input: {
  speech: string;
  speechLocale: string;
}): string {
  const sayText = escapeXml(sanitizeForSpeech(input.speech));

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna" language="${input.speechLocale}">${sayText}</Say></Response>`;
}

export function buildGoodbyeTwiml(speechLocale: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna" language="${speechLocale}">Thank you for calling. Goodbye.</Say></Response>`;
}

export function buildDialPhoneNumberTwiml(input: {
  callerId: string;
  toNumber: string;
  recordingStatusCallback?: string | null;
}): string {
  const callerId = escapeXml(input.callerId);
  const toNumber = escapeXml(input.toNumber);
  const recordingAttrs = input.recordingStatusCallback
    ? ` record="record-from-answer" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}"${recordingAttrs}>
    <Number>${toNumber}</Number>
  </Dial>
</Response>`;
}

export function buildDialClientTwiml(input: {
  clientIdentity: string;
  timeoutSeconds?: number;
  actionUrl?: string;
  speechLocale: string;
  recordingStatusCallback?: string | null;
}): string {
  const identity = escapeXml(input.clientIdentity);
  const timeout = input.timeoutSeconds ?? 25;
  const actionAttr = input.actionUrl
    ? ` action="${escapeXml(input.actionUrl)}"`
    : "";
  const recordingAttrs = input.recordingStatusCallback
    ? ` record="record-from-answer" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}"${actionAttr}${recordingAttrs}>
    <Client>${identity}</Client>
  </Dial>
</Response>`;
}

export function buildRecordingStatusCallbackUrl(businessId: string): string {
  const base = getAppUrl();
  const url = new URL(`${base}/api/webhooks/voice/recording`);
  url.searchParams.set("businessId", businessId);
  return url.toString();
}

export function buildHandoffTwimlUrl(businessId: string): string {
  const base = getAppUrl();
  const url = new URL(`${base}/api/webhooks/voice/handoff`);
  url.searchParams.set("businessId", businessId);
  return url.toString();
}

export function withCallRecording(
  twiml: string,
  recordingStatusCallback: string | null | undefined,
): string {
  if (!recordingStatusCallback?.trim()) {
    return twiml;
  }

  const callback = escapeXml(recordingStatusCallback.trim());
  const recordingBlock = `<Start><Recording recordingStatusCallback="${callback}" recordingStatusCallbackMethod="POST"/></Start>`;

  if (twiml.includes("<Start>")) {
    return twiml;
  }

  return twiml.replace("<Response>", `<Response>${recordingBlock}`);
}

export function buildHandoffToAgentTwiml(input: {
  speechLocale: string;
  clientIdentity: string;
  actionUrl?: string;
  recordingStatusCallback?: string | null;
}): string {
  const identity = escapeXml(input.clientIdentity);
  const actionAttr = input.actionUrl
    ? ` action="${escapeXml(input.actionUrl)}"`
    : "";
  const recordingAttrs = input.recordingStatusCallback
    ? ` record="record-from-answer" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="${input.speechLocale}">Please hold while I connect you with a team member.</Say>
  <Dial timeout="25"${actionAttr}${recordingAttrs}>
    <Client>${identity}</Client>
  </Dial>
</Response>`;
}
