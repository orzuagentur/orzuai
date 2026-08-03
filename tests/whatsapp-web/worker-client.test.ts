import { describe, expect, it } from "vitest";

import { normalizeWhatsAppWebWorkerUrl } from "@/lib/whatsapp-web/worker-client";

describe("normalizeWhatsAppWebWorkerUrl", () => {
  it("defaults bare remote hosts to https", () => {
    expect(
      normalizeWhatsAppWebWorkerUrl(
        "my-whatsapp-web-worker.up.railway.app",
      ),
    ).toBe("https://my-whatsapp-web-worker.up.railway.app");
  });

  it("preserves explicit protocols and removes trailing slashes", () => {
    expect(
      normalizeWhatsAppWebWorkerUrl("https://example.com///"),
    ).toBe("https://example.com");
    expect(
      normalizeWhatsAppWebWorkerUrl("http://localhost:8080/"),
    ).toBe("http://localhost:8080");
  });

  it("defaults bare localhost URLs to http", () => {
    expect(normalizeWhatsAppWebWorkerUrl("localhost:8080")).toBe(
      "http://localhost:8080",
    );
  });

  it("rejects empty or malformed URLs", () => {
    expect(normalizeWhatsAppWebWorkerUrl("")).toBeNull();
    expect(normalizeWhatsAppWebWorkerUrl("   ")).toBeNull();
    expect(normalizeWhatsAppWebWorkerUrl("https://")).toBeNull();
  });
});
