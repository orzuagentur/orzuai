import type { IntegrationChannelStatusMap } from "@/features/integrations/channel-status";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";

export type AiManagerChannelEntry = {
  channel: MessagingIntegrationChannelId;
  settings: ChannelAiSettingsData;
};

export type AiManagerPageData = {
  hasBusiness: boolean;
  activeChannel: MessagingIntegrationChannelId | null;
  channelStatuses: IntegrationChannelStatusMap;
  channels: AiManagerChannelEntry[];
  enabledChannelCount: number;
  connectedChannelCount: number;
};
