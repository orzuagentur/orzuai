import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptSecretValue,
  decryptSecretValueWithRotation,
  encryptSecretValue,
} from "@orzu/secrets/crypto";

// Valid 64-hex keys (deriveKey uses the hex fast-path).
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

describe("secret encryption", () => {
  it("round-trips with the same key", () => {
    const encrypted = encryptSecretValue("hello-secret", KEY_A);
    expect(decryptSecretValue(encrypted, KEY_A)).toBe("hello-secret");
  });

  it("produces different ciphertext each time (random IV)", () => {
    const a = encryptSecretValue("same", KEY_A);
    const b = encryptSecretValue("same", KEY_A);
    expect(a).not.toBe(b);
    expect(decryptSecretValue(a, KEY_A)).toBe("same");
    expect(decryptSecretValue(b, KEY_A)).toBe("same");
  });

  it("fails to decrypt with a different key", () => {
    const encrypted = encryptSecretValue("hello-secret", KEY_A);
    expect(() => decryptSecretValue(encrypted, KEY_B)).toThrow();
  });
});

describe("key rotation (decryptSecretValueWithRotation)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_PREVIOUS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("decrypts values written with the primary key", () => {
    process.env.ENCRYPTION_KEY = KEY_B;
    const encrypted = encryptSecretValue("primary-value", KEY_B);
    expect(decryptSecretValueWithRotation(encrypted)).toBe("primary-value");
  });

  it("falls back to the previous key during rotation", () => {
    // Value encrypted with the OLD key before rotation.
    const legacy = encryptSecretValue("legacy-value", KEY_A);
    // After rotation: new primary is B, previous is A.
    process.env.ENCRYPTION_KEY = KEY_B;
    process.env.ENCRYPTION_KEY_PREVIOUS = KEY_A;
    expect(decryptSecretValueWithRotation(legacy)).toBe("legacy-value");
  });

  it("throws when neither primary nor previous key can decrypt", () => {
    const encrypted = encryptSecretValue("orphan", KEY_A);
    process.env.ENCRYPTION_KEY = KEY_B;
    // No previous key configured.
    expect(() => decryptSecretValueWithRotation(encrypted)).toThrow();
  });
});
