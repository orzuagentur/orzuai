import {
  isChannelActivated,
  MESSAGING_INTEGRATION_CHANNELS,
} from "@/features/integrations";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

export function getConnectedMessagingChannels(
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingIntegrationChannelId[],
): MessagingIntegrationChannelId[] {
  return MESSAGING_INTEGRATION_CHANNELS.filter(
    (channel) =>
      visibleChannelIds.includes(channel) &&
      isChannelActivated(channel, channelStatuses),
  );
}

export function filterAgentChannelsToConnected(
  channels: MessagingIntegrationChannelId[],
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingIntegrationChannelId[],
): MessagingIntegrationChannelId[] {
  const connected = new Set(
    getConnectedMessagingChannels(channelStatuses, visibleChannelIds),
  );

  return channels.filter((channel) => connected.has(channel));
}
