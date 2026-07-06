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

  if (channel === "sms") {
    return "bg-teal-50 dark:bg-teal-950/50";
  }

  if (channel === "email") {
    return "bg-red-50 dark:bg-red-950/40";
  }

  if (channel === "google_calendar") {
    return "bg-blue-50 dark:bg-blue-950/50";
  }

  if (channel === "website_chat") {
    return "bg-violet-50 dark:bg-violet-950/50";
  }

  if (channel === "website_forms") {
    return "bg-amber-50 dark:bg-amber-950/50";
  }

  return "bg-muted/50";
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

  if (channel === "email") {
    return "Email";
  }

  if (channel === "voice") {
    return "Calls";
  }

  if (channel === "sms") {
    return "SMS";
  }

  if (channel === "website_chat") {
    return "Website Chat";
  }

  if (channel === "website_forms") {
    return "Lead Forms";
  }

  if (channel === "facebook_messenger") {
    return "Messenger";
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

  if (channel === "voice") {
    return "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200";
  }

  if (channel === "sms") {
    return "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200";
  }

  if (channel === "website_chat") {
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200";
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
