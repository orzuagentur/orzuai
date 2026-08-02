import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(encryptionKey: string): Buffer {
  const trimmed = encryptionKey.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  if (trimmed.length >= 32) {
    return scryptSync(trimmed, "orzu-secrets-salt", 32);
  }

  throw new Error("ENCRYPTION_KEY must be at least 32 characters or 64 hex chars.");
}

export function encryptSecretValue(
  plaintext: string,
  encryptionKey: string,
): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecretValue(
  payload: string,
  encryptionKey: string,
): string {
  const [ivPart, authTagPart, cipherPart] = payload.split(".");

  if (!ivPart || !authTagPart || !cipherPart) {
    throw new Error("Invalid encrypted secret payload.");
  }

  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function getEncryptionKeyFromEnv(): string {
  const value = process.env.ENCRYPTION_KEY?.trim();

  if (!value) {
    throw new Error("Missing ENCRYPTION_KEY environment variable.");
  }

  return value;
}

/**
 * Optional previous key, used only during key rotation. When set, values that
 * fail to decrypt with the primary `ENCRYPTION_KEY` are retried with this key.
 */
export function getPreviousEncryptionKeyFromEnv(): string | null {
  return process.env.ENCRYPTION_KEY_PREVIOUS?.trim() || null;
}

/**
 * Decrypts a secret trying the primary key first, then the previous key (if
 * `ENCRYPTION_KEY_PREVIOUS` is set). This enables zero-downtime rotation:
 *
 *   1. Set `ENCRYPTION_KEY_PREVIOUS` = old key, `ENCRYPTION_KEY` = new key.
 *   2. Deploy — new writes use the new key, old rows still decrypt via previous.
 *   3. Run `npm run rotate:secrets` to re-encrypt every row with the new key.
 *   4. Remove `ENCRYPTION_KEY_PREVIOUS` and redeploy.
 */
export function decryptSecretValueWithRotation(payload: string): string {
  const primary = getEncryptionKeyFromEnv();

  try {
    return decryptSecretValue(payload, primary);
  } catch (error) {
    const previous = getPreviousEncryptionKeyFromEnv();

    if (previous && previous !== primary) {
      return decryptSecretValue(payload, previous);
    }

    throw error;
  }
}
