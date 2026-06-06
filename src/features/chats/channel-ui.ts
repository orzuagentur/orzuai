import type { IntegrationChannelId } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";

export function getChannelIconContainerClassName(
  channel: MessagingChannel | IntegrationChannelId,
): string {
  if (channel === "whatsapp") {
    return "bg-emerald-50 dark:bg-emerald-950/50";
  }

  if (channel === "instagram") {
    return "bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 dark:from-orange-950/40 dark:via-pink-950/40 dark:to-purple-950/40";
  }

  if (channel === "telegram") {
    return "bg-sky-50 dark:bg-sky-950/50";
  }

  if (channel === "voice") {
    return "bg-indigo-50 dark:bg-indigo-950/50";
  }

  return "bg-amber-50 dark:bg-amber-950/50";
}

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

export function getChannelBadgeClassName(channel: MessagingChannel): string {
  if (channel === "whatsapp") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (channel === "instagram") {
    return "border-fuchsia-200 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 text-fuchsia-900 dark:border-fuchsia-900 dark:from-orange-950 dark:via-pink-950 dark:to-purple-950 dark:text-fuchsia-100";
  }

  if (channel === "telegram") {
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
}

export function getChannelIconClassName(channel: MessagingChannel): string {
  if (channel === "whatsapp") {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (channel === "instagram") {
    return "text-fuchsia-600 dark:text-fuchsia-400";
  }

  if (channel === "telegram") {
    return "text-sky-600 dark:text-sky-400";
  }

  return "text-amber-600 dark:text-amber-400";
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

  return "outline";
}
