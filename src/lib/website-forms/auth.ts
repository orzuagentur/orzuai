import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "orzu_live_";

export function generateWebhookToken(): string {
  return randomBytes(24).toString("hex");
}

export function generateWebsiteFormApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashWebsiteFormApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function getWebsiteFormApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}

export function verifyWebsiteFormApiKey(
  apiKey: string,
  storedHash: string,
): boolean {
  if (!apiKey || !storedHash) {
    return false;
  }

  const computed = hashWebsiteFormApiKey(apiKey);
  return computed === storedHash;
}

export function extractWebsiteFormApiKey(
  request: Request,
): string | null {
  const headerKey = request.headers.get("x-orzuai-api-key")?.trim();

  if (headerKey) {
    return headerKey;
  }

  const authorization = request.headers.get("authorization")?.trim();

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
}
