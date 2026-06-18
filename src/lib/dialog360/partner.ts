import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";

const DIALOG360_PARTNER_API_BASE = "https://hub.360dialog.io";

function getPartnerApiKey(): string | undefined {
  return process.env[ENV_KEYS.DIALOG360_PARTNER_API_KEY]?.trim() || undefined;
}

function partnerHeaders(): HeadersInit {
  const apiKey = getPartnerApiKey();

  if (!apiKey) {
    throw new Error("DIALOG360_PARTNER_API_KEY is not configured.");
  }

  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };
}

function buildPartnerUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${DIALOG360_PARTNER_API_BASE}${normalizedPath}`;
}

export function getDialog360PartnerId(): string | undefined {
  return (
    process.env[ENV_KEYS.NEXT_PUBLIC_DIALOG360_PARTNER_ID]?.trim() || undefined
  );
}

export function hasDialog360EmbeddedSignupEnv(): boolean {
  return Boolean(getDialog360PartnerId() && getPartnerApiKey());
}

export function getDialog360PlatformSecret(): string | undefined {
  return process.env[ENV_KEYS.DIALOG360_PLATFORM_SECRET]?.trim() || undefined;
}

export function verifyDialog360PartnerWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = getDialog360PlatformSecret();

  if (!secret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (expected.length !== signatureHeader.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

type PartnerApiError = { success: false; message: string };

export type Dialog360ChannelApiKeyResult =
  | { success: true; apiKey: string }
  | PartnerApiError;

export async function generateDialog360ChannelApiKey(
  channelId: string,
): Promise<Dialog360ChannelApiKeyResult> {
  const partnerId = getDialog360PartnerId();

  if (!partnerId) {
    return { success: false, message: "360dialog Partner ID is not configured." };
  }

  const response = await fetch(
    buildPartnerUrl(`/api/v2/partners/${partnerId}/channels/${channelId}/api_keys`),
    {
      method: "POST",
      headers: partnerHeaders(),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { api_key?: string; meta?: { developer_message?: string } }
    | null;

  if (!response.ok || !payload?.api_key) {
    return {
      success: false,
      message:
        payload?.meta?.developer_message ||
        "Unable to generate a 360dialog API key for this channel.",
    };
  }

  return { success: true, apiKey: payload.api_key };
}

export type Dialog360ChannelDetails = {
  phoneNumber: string;
  phoneName?: string;
  metaPhoneNumberId?: string;
  availabilityStatus?: string;
  status?: string;
};

export async function getDialog360ChannelDetails(
  clientId: string,
  channelId: string,
  phoneHint?: string,
): Promise<Dialog360ChannelDetails | null> {
  const partnerId = getDialog360PartnerId();

  if (!partnerId) {
    return null;
  }

  const [channelResponse, commerceResponse] = await Promise.all([
    fetch(
      buildPartnerUrl(`/api/v2/partners/${partnerId}/channels/${channelId}`),
      { headers: partnerHeaders(), cache: "no-store" },
    ),
    fetch(
      buildPartnerUrl(
        `/api/v2/partners/${partnerId}/clients/${clientId}/channels/${channelId}/whatsapp_commerce_settings`,
      ),
      { headers: partnerHeaders(), cache: "no-store" },
    ),
  ]);

  const channelPayload = (await channelResponse.json().catch(() => null)) as
    | {
        setup_info?: { phone_number?: string; phone_name?: string };
        availability_status?: string;
        status?: string;
      }
    | null;

  const commercePayload = (await commerceResponse.json().catch(() => null)) as
    | { data?: Array<{ id?: string }> }
    | null;

  const phoneNumber =
    channelPayload?.setup_info?.phone_number?.trim() ||
    phoneHint?.trim() ||
    "";

  if (!phoneNumber) {
    return null;
  }

  return {
    phoneNumber,
    phoneName: channelPayload?.setup_info?.phone_name ?? undefined,
    metaPhoneNumberId: commercePayload?.data?.[0]?.id,
    availabilityStatus: channelPayload?.availability_status ?? undefined,
    status: channelPayload?.status ?? undefined,
  };
}

export type Dialog360PartnerWebhookPayload = {
  event?: string;
  data?: {
    id?: string;
    client_id?: string;
    setup_info?: {
      phone_number?: string;
      phone_name?: string;
    };
    availability_status?: string;
    status?: string;
  };
};

export function isDialog360ChannelReadyEvent(event?: string): boolean {
  return (
    event === "channel_live" ||
    event === "channel_running" ||
    event === "channel_ready" ||
    event === "channel_permission_granted"
  );
}
