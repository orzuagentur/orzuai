import type { MessagingChannel } from "@/types/database.types";

export function createEmptyUnreadByChannel(): Record<MessagingChannel, number> {
  return {
    whatsapp: 0,
    telegram: 0,
    instagram: 0,
    website_forms: 0,
    email: 0,
    facebook_messenger: 0,
  };
}

export function createEmptyChannelConnectionMap(): Record<MessagingChannel, boolean> {
  return {
    whatsapp: false,
    telegram: false,
    instagram: false,
    website_forms: false,
    email: false,
    facebook_messenger: false,
  };
}
