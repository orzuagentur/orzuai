import { describe, expect, it } from "vitest";

import {
  parseAiIntensity,
  shouldDeferExtraInboundLlmCalls,
} from "@/lib/ai/ai-intensity";

describe("ai intensity", () => {
  it("defaults unknown values to light", () => {
    expect(parseAiIntensity(null)).toBe("light");
    expect(parseAiIntensity("light")).toBe("light");
    expect(parseAiIntensity("full")).toBe("full");
  });

  it("defers extra LLM side effects only in light mode", () => {
    expect(shouldDeferExtraInboundLlmCalls("light")).toBe(true);
    expect(shouldDeferExtraInboundLlmCalls("full")).toBe(false);
  });
});
