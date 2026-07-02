import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export type PlatformPreviewTokenPayload = {
  businessId: string;
  adminUserId: string;
  adminEmail: string;
  exp: number;
};

function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}

export function createPlatformPreviewToken(input: {
  businessId: string;
  adminUserId: string;
  adminEmail: string;
}): string | null {
  const secret = getSigningSecret();

  if (!secret) {
    return null;
  }

  const payload: PlatformPreviewTokenPayload = {
    businessId: input.businessId,
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyPlatformPreviewToken(
  token: string,
): PlatformPreviewTokenPayload | null {
  const secret = getSigningSecret();

  if (!secret) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");

  try {
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as PlatformPreviewTokenPayload;

    if (
      !payload.businessId ||
      !payload.adminUserId ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
