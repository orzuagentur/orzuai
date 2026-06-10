import {
  isChannelActivated,
  MESSAGING_INTEGRATION_CHANNELS,
} from "@/features/integrations";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { MessagingChannel } from "@/types/database.types";

export function getConnectedMessagingChannels(
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingChannel[],
): MessagingChannel[] {
  return MESSAGING_INTEGRATION_CHANNELS.filter(
    (channel) =>
      visibleChannelIds.includes(channel) &&
      isChannelActivated(channel, channelStatuses),
  );
}

export function filterAgentChannelsToConnected(
  channels: MessagingChannel[],
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingChannel[],
): MessagingChannel[] {
  const connected = new Set(
    getConnectedMessagingChannels(channelStatuses, visibleChannelIds),
  );

  return channels.filter((channel) => connected.has(channel));
}
