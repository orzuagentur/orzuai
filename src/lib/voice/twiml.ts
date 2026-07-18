import { buildAppUrl } from "@/lib/app-url";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";

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
  const base = buildAppUrl("");
  const url = new URL(`${base}/api/webhooks/voice/gather`);
  url.searchParams.set("businessId", input.businessId);
  url.searchParams.set("direction", input.direction);

  if (input.triggerReason) {
    url.searchParams.set("triggerReason", input.triggerReason);
  }

  return appendTwilioWebhookSignature(url.toString(), input.businessId);
}

export function mapVoiceLanguageToPollyVoice(speechLocale: string): string {
  switch (speechLocale) {
    case "uk-UA":
      return "Polly.Olena";
    case "ru-RU":
      return "Polly.Tatyana";
    case "de-DE":
      return "Polly.Marlene";
    case "es-ES":
      return "Polly.Conchita";
    default:
      return "Polly.Joanna";
  }
}

export function buildPlayAndGatherTwiml(input: {
  audioUrl: string;
  gatherActionUrl: string;
  speechLocale: string;
  repromptSpeech?: string;
  goodbyeSpeech?: string;
}): string {
  const audioUrl = escapeXml(input.audioUrl);
  const reprompt = escapeXml(
    sanitizeForSpeech(
      input.repromptSpeech ??
        "I did not catch that. Please say that again.",
    ),
  );
  const goodbye = escapeXml(
    sanitizeForSpeech(input.goodbyeSpeech ?? "Thank you for calling. Goodbye."),
  );
  const voice = mapVoiceLanguageToPollyVoice(input.speechLocale);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" action="${escapeXml(input.gatherActionUrl)}" method="POST" speechTimeout="auto" language="${input.speechLocale}" timeout="5">
    <Say voice="${voice}" language="${input.speechLocale}">${reprompt}</Say>
  </Gather>
  <Say voice="${voice}" language="${input.speechLocale}">${goodbye}</Say>
</Response>`;
}

export function buildPlayTwiml(input: {
  audioUrl: string;
  speechLocale: string;
  goodbyeSpeech?: string;
}): string {
  const audioUrl = escapeXml(input.audioUrl);
  const goodbye = escapeXml(
    sanitizeForSpeech(input.goodbyeSpeech ?? "Thank you for calling. Goodbye."),
  );
  const voice = mapVoiceLanguageToPollyVoice(input.speechLocale);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Say voice="${voice}" language="${input.speechLocale}">${goodbye}</Say>
</Response>`;
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
  const voice = mapVoiceLanguageToPollyVoice(input.speechLocale);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${input.speechLocale}">${sayText}</Say>
  <Gather input="speech" action="${escapeXml(input.gatherActionUrl)}" method="POST" speechTimeout="auto" language="${input.speechLocale}" timeout="5">
    <Say voice="${voice}" language="${input.speechLocale}">${reprompt}</Say>
  </Gather>
  <Say voice="${voice}" language="${input.speechLocale}">Thank you for calling. Goodbye.</Say>
</Response>`;
}

export function buildStaticSayTwiml(input: {
  speech: string;
  speechLocale: string;
}): string {
  const sayText = escapeXml(sanitizeForSpeech(input.speech));
  const voice = mapVoiceLanguageToPollyVoice(input.speechLocale);

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}" language="${input.speechLocale}">${sayText}</Say></Response>`;
}

export function buildGoodbyeTwiml(speechLocale: string): string {
  const voice = mapVoiceLanguageToPollyVoice(speechLocale);

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}" language="${speechLocale}">Thank you for calling. Goodbye.</Say></Response>`;
}

export function buildDialPhoneNumberTwiml(input: {
  callerId: string;
  toNumber: string;
  statusCallbackUrl?: string | null;
  recordingStatusCallback?: string | null;
}): string {
  const callerId = escapeXml(input.callerId);
  const toNumber = escapeXml(input.toNumber);
  const statusCallbackAttrs = input.statusCallbackUrl
    ? ` statusCallback="${escapeXml(input.statusCallbackUrl)}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed"`
    : "";
  const recordingAttrs = input.recordingStatusCallback
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}"${recordingAttrs}>
    <Number${statusCallbackAttrs}>${toNumber}</Number>
  </Dial>
</Response>`;
}

export function buildConferenceStatusCallbackUrl(input: {
  businessId: string;
  parentCallSid?: string | null;
}): string {
  const base = buildAppUrl("");
  const url = new URL(`${base}/api/webhooks/voice/conference`);
  url.searchParams.set("businessId", input.businessId);

  if (input.parentCallSid?.trim()) {
    url.searchParams.set("parentCallSid", input.parentCallSid.trim());
  }

  return appendTwilioWebhookSignature(url.toString(), input.businessId);
}

export function buildDialConferenceTwiml(input: {
  conferenceName: string;
  participantLabel: "operator" | "customer" | "ai" | "supervisor";
  statusCallbackUrl: string;
  startConferenceOnEnter: boolean;
  endConferenceOnExit: boolean;
  waitUrl?: string;
  recordingStatusCallback?: string | null;
}): string {
  const conferenceName = escapeXml(input.conferenceName);
  const participantLabel = escapeXml(input.participantLabel);
  const statusCallbackUrl = escapeXml(input.statusCallbackUrl);
  const waitUrl = input.waitUrl
    ? ` waitUrl="${escapeXml(input.waitUrl)}"`
    : "";
  const recordingAttrs = input.recordingStatusCallback
    ? ` record="record-from-start" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference participantLabel="${participantLabel}" startConferenceOnEnter="${input.startConferenceOnEnter}" endConferenceOnExit="${input.endConferenceOnExit}" beep="false" statusCallback="${statusCallbackUrl}" statusCallbackMethod="POST" statusCallbackEvent="start end join leave mute hold speaker"${waitUrl}${recordingAttrs}>${conferenceName}</Conference>
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
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}"${actionAttr}${recordingAttrs}>
    <Client>${identity}</Client>
  </Dial>
</Response>`;
}

export function buildRecordingStatusCallbackUrl(
  businessId: string,
  parentCallSid?: string | null,
): string {
  const base = buildAppUrl("");
  const url = new URL(`${base}/api/webhooks/voice/recording`);
  url.searchParams.set("businessId", businessId);

  if (parentCallSid?.trim()) {
    url.searchParams.set("parentCallSid", parentCallSid.trim());
  }

  return appendTwilioWebhookSignature(url.toString(), businessId);
}

export function buildHandoffTwimlUrl(businessId: string): string {
  const base = buildAppUrl("");
  const url = new URL(`${base}/api/webhooks/voice/handoff`);
  url.searchParams.set("businessId", businessId);
  return appendTwilioWebhookSignature(url.toString(), businessId);
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
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(input.recordingStatusCallback)}" recordingStatusCallbackMethod="POST"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="${input.speechLocale}">Please hold while I connect you with a team member.</Say>
  <Dial timeout="25"${actionAttr}${recordingAttrs}>
    <Client>${identity}</Client>
  </Dial>
</Response>`;
}
