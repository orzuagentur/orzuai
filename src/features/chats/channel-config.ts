import {
  INBOX_MESSAGING_CHANNELS,
  INTEGRATION_CHANNEL_LIST,
  type InboxMessagingChannelId,
  type IntegrationChannelConfig,
} from "@/features/integrations/constants";

export const CHAT_CHANNEL_LIST = INTEGRATION_CHANNEL_LIST.filter(
  (channel): channel is IntegrationChannelConfig & { id: InboxMessagingChannelId } =>
    (INBOX_MESSAGING_CHANNELS as readonly string[]).includes(channel.id),
);

export type ChatChannelId = InboxMessagingChannelId;

export function isChatChannelId(value: string): value is ChatChannelId {
  return (INBOX_MESSAGING_CHANNELS as readonly string[]).includes(value);
}

export const DEFAULT_CHAT_CHANNEL: ChatChannelId = "whatsapp";
