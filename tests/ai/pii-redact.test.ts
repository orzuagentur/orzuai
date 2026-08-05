import { describe, expect, it } from "vitest";

import { redactPiiForStorage } from "@/lib/ai/pii-redact";

describe("redactPiiForStorage", () => {
  it("redacts email and phone patterns", () => {
    const input = "Call me at +1 555 123 4567 or email john@example.com please";
    const output = redactPiiForStorage(input);

    expect(output).toContain("[email]");
    expect(output).toContain("[phone]");
    expect(output).not.toContain("john@example.com");
  });
});
