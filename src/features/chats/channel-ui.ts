import type { MessagingChannel } from "@/types/database.types";

export function getChannelBadgeLabel(channel: MessagingChannel): string {
  if (channel === "whatsapp") {
    return "WhatsApp";
  }

  if (channel === "instagram") {
    return "Instagram";
  }

  if (channel === "telegram") {
    return "Telegram";
  }

  return "Website";
}

export function getChannelBadgeVariant(
  channel: MessagingChannel,
): "default" | "secondary" | "outline" {
  if (channel === "whatsapp") {
    return "default";
  }

  if (channel === "instagram") {
    return "secondary";
  }

  if (channel === "telegram") {
    return "outline";
  }

  return "outline";
}
