import { signVoiceStreamToken } from "@/lib/voice/stream-config";
import { withCallRecording } from "@/lib/voice/twiml";

export function buildMediaStreamConnectTwiml(input: {
  businessId: string;
  wsUrl: string;
  callSid: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
  callLogId?: string | null;
  recordingStatusCallback?: string | null;
}): string {
  const streamToken = signVoiceStreamToken({
    businessId: input.businessId,
    callSid: input.callSid,
  });

  const parameterXml = [
    `<Parameter name="businessId" value="${escapeXmlAttr(input.businessId)}" />`,
    `<Parameter name="direction" value="${escapeXmlAttr(input.direction)}" />`,
    `<Parameter name="callSid" value="${escapeXmlAttr(input.callSid)}" />`,
    input.callLogId?.trim()
      ? `<Parameter name="callLogId" value="${escapeXmlAttr(input.callLogId.trim())}" />`
      : "",
    streamToken
      ? `<Parameter name="streamToken" value="${escapeXmlAttr(streamToken)}" />`
      : "",
    input.triggerReason?.trim()
      ? `<Parameter name="triggerReason" value="${escapeXmlAttr(input.triggerReason.trim())}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n      ");

  const signedUrl = buildSignedStreamUrl({
    wsUrl: input.wsUrl,
    businessId: input.businessId,
    callSid: input.callSid,
    callLogId: input.callLogId,
    streamToken,
  });

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXmlAttr(signedUrl)}">
      ${parameterXml}
    </Stream>
  </Connect>
</Response>`;

  return withCallRecording(twiml, input.recordingStatusCallback);
}

function buildSignedStreamUrl(input: {
  wsUrl: string;
  businessId: string;
  callSid: string;
  callLogId?: string | null;
  streamToken: string | null;
}): string {
  const url = new URL(input.wsUrl.trim());
  url.searchParams.set("businessId", input.businessId);
  url.searchParams.set("callSid", input.callSid);

  if (input.callLogId?.trim()) {
    url.searchParams.set("callLogId", input.callLogId.trim());
  }

  if (input.streamToken) {
    url.searchParams.set("streamToken", input.streamToken);
  }

  return url.toString();
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
