import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export function validateTwilioRequestSignature(input: {
  authToken: string;
  signature: string | null;
  url: string;
  params: Record<string, string>;
}): boolean {
  const signature = input.signature?.trim();

  if (!signature) {
    return false;
  }

  const sortedKeys = Object.keys(input.params).sort();
  let payload = input.url;

  for (const key of sortedKeys) {
    payload += key + input.params[key];
  }

  const expected = createHmac("sha1", input.authToken)
    .update(payload, "utf8")
    .digest("base64");

  try {
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}
