import {
  INTEGRATION_CHANNEL_LIST,
  type IntegrationChannelConfig,
} from "./constants";
import type { IntegrationChannelStatusMap } from "./channel-status";
import { isChannelConnectedForWorkspace } from "./channel-status";

export function isChannelActivated(
  channelId: IntegrationChannelConfig["id"],
  statuses: IntegrationChannelStatusMap,
): boolean {
  return isChannelConnectedForWorkspace(channelId, statuses);
}

export function getActivatedIntegrationChannels(
  statuses: IntegrationChannelStatusMap,
): IntegrationChannelConfig[] {
  return INTEGRATION_CHANNEL_LIST.filter((channel) =>
    isChannelActivated(channel.id, statuses),
  );
}

export function getMarketplaceIntegrationChannels(): IntegrationChannelConfig[] {
  return INTEGRATION_CHANNEL_LIST.filter((channel) => channel.available);
}
