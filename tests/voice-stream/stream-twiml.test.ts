import { describe, expect, it } from "vitest";

import { buildAuthenticatedVoiceStreamUrl } from "@/lib/voice/stream-url";

describe("buildAuthenticatedVoiceStreamUrl", () => {
  it("keeps Twilio Stream URL query-free and carries auth context in the path", () => {
    const streamUrl = buildAuthenticatedVoiceStreamUrl({
      businessId: "business-123",
      wsUrl: "wss://voice.example.com/voice/stream?legacy=1",
      callSid: "CA123",
      streamToken: "token/value",
    });

    const parsedUrl = new URL(streamUrl);

    expect(parsedUrl.search).toBe("");
    expect(parsedUrl.pathname).toBe(
      "/voice/stream/business-123/CA123/token%2Fvalue",
    );
  });
});
