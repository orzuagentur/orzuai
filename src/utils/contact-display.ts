import type { MessagingChannel } from "@/types/database.types";

export function formatContactIdentifier(identifier: string): string {
  if (identifier.startsWith("ig:")) {
    return `Instagram · ${identifier.slice(3)}`;
  }

  if (identifier.startsWith("tg:")) {
    return `Telegram · ${identifier.slice(3)}`;
  }

  return identifier;
}

/** Twilio Voice / SMS only — hide call, dialpad & SMS for WhatsApp, Telegram, chat, etc. */
export function canUseTwilioPhoneActions(contact: {
  channel: MessagingChannel;
  identifier: string;
}): boolean {
  if (contact.channel !== "sms" && contact.channel !== "voice") {
    return false;
  }

  const identifier = contact.identifier.trim();
  if (!identifier || /^(tg:|ig:|web:)/i.test(identifier)) {
    return false;
  }

  const digits = identifier.replace(/\D/g, "");
  return digits.length >= 8;
}
