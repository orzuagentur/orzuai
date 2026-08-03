import type { MessagingChannel } from "@/types/database.types";
import { canonicalPhoneNumber, phoneDigitsOnly } from "@/utils/whatsapp";

export function toChannelExternalId(
  channel: MessagingChannel,
  identifier: string,
): string {
  const trimmed = identifier.trim();

  if (channel === "whatsapp" || channel === "whatsapp_web") {
    // Preserve WhatsApp JIDs (including @lid) so outbound can reply correctly.
    if (trimmed.includes("@")) {
      return trimmed;
    }

    return canonicalPhoneNumber(trimmed) || phoneDigitsOnly(trimmed) || trimmed;
  }

  if (channel === "telegram" || channel === "telegram_user") {
    return trimmed.replace(/^tg:/, "");
  }

  if (channel === "instagram") {
    return trimmed.replace(/^ig:/, "");
  }

  if (channel === "email" || channel === "outlook") {
    return trimmed.toLowerCase();
  }

  if (channel === "facebook_messenger") {
    return trimmed.replace(/^fb:/, "");
  }

  return trimmed;
}

export function toLegacyContactPhoneNumber(
  channel: MessagingChannel,
  externalId: string,
): string {
  if (channel === "telegram" || channel === "telegram_user") {
    return externalId.startsWith("tg:") ? externalId : `tg:${externalId}`;
  }

  if (channel === "instagram") {
    return externalId.startsWith("ig:") ? externalId : `ig:${externalId}`;
  }

  if (channel === "email" || channel === "outlook") {
    return externalId;
  }

  if (channel === "facebook_messenger") {
    return externalId.startsWith("fb:") ? externalId : `fb:${externalId}`;
  }

  return externalId;
}

export function whatsappPhoneVariants(identifier: string): string[] {
  const canonical = canonicalPhoneNumber(identifier);
  const digits = phoneDigitsOnly(identifier);

  return [...new Set([canonical, digits, `+${digits}`].filter(Boolean))];
}
