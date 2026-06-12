import type { ChannelAdapter } from "@/services/channels/types";
import type { MessagingChannel } from "@/types/database.types";

const registeredChannels = new Set<MessagingChannel>([
  "whatsapp",
  "telegram",
  "instagram",
  "website_forms",
  "email",
  "facebook_messenger",
]);

export function isRegisteredMessagingChannel(
  channel: MessagingChannel,
): boolean {
  return registeredChannels.has(channel);
}

export function listRegisteredChannelAdapters(): ChannelAdapter["channel"][] {
  return [...registeredChannels];
}
