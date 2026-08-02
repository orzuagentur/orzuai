import { createHmac } from "node:crypto";

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ENV_KEYS } from "@/constants/env-keys";
import { isCronAuthorized } from "@/lib/cron/run-authorized-cron";
import { verifyWhatsAppWebhookSignature } from "@/lib/whatsapp/client";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("verifyWhatsAppWebhookSignature", () => {
  const APP_SECRET = "whatsapp-app-secret";
  const body = JSON.stringify({ entry: [{ id: "1" }] });

  function sign(payload: string, secret = APP_SECRET): string {
    return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  }

  beforeEach(() => {
    process.env[ENV_KEYS.WHATSAPP_APP_SECRET] = APP_SECRET;
  });

  it("accepts a valid signature", () => {
    expect(verifyWhatsAppWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWhatsAppWebhookSignature(body, null)).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", () => {
    expect(verifyWhatsAppWebhookSignature(body, sign(body, "wrong"))).toBe(false);
  });

  it("rejects a tampered body", () => {
    const signature = sign(body);
    expect(verifyWhatsAppWebhookSignature(`${body} `, signature)).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    expect(verifyWhatsAppWebhookSignature(body, "deadbeef")).toBe(false);
  });
});

describe("isCronAuthorized", () => {
  const SECRET = "cron-secret-value";

  function requestWith(authorization?: string): NextRequest {
    const headers = new Headers();
    if (authorization) {
      headers.set("authorization", authorization);
    }
    return { headers } as unknown as NextRequest;
  }

  beforeEach(() => {
    process.env[ENV_KEYS.CRON_SECRET] = SECRET;
  });

  it("accepts a correct Bearer secret", () => {
    expect(isCronAuthorized(requestWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isCronAuthorized(requestWith("Bearer nope"))).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    expect(isCronAuthorized(requestWith())).toBe(false);
  });

  it("rejects a secret without the Bearer prefix", () => {
    expect(isCronAuthorized(requestWith(SECRET))).toBe(false);
  });

  it("rejects any request when CRON_SECRET is not configured", () => {
    delete process.env[ENV_KEYS.CRON_SECRET];
    expect(isCronAuthorized(requestWith(`Bearer ${SECRET}`))).toBe(false);
  });
});
