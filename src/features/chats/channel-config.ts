import {
  INTEGRATION_CHANNEL_LIST,
  MESSAGING_INTEGRATION_CHANNELS,
  type IntegrationChannelConfig,
  type MessagingIntegrationChannelId,
} from "@/features/integrations/constants";

export const CHAT_CHANNEL_LIST = INTEGRATION_CHANNEL_LIST.filter(
  (channel): channel is IntegrationChannelConfig & { id: MessagingIntegrationChannelId } =>
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel.id),
);

export type ChatChannelId = MessagingIntegrationChannelId;

export function isChatChannelId(value: string): value is ChatChannelId {
  return (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(value);
}

export const DEFAULT_CHAT_CHANNEL: ChatChannelId = "whatsapp";
