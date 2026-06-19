import "server-only";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  type MessagingIntegrationChannelId,
} from "@/features/integrations/constants";
import {
  buildIntegrationChannelStatuses,
  isChannelConnectedForWorkspace,
} from "@/features/integrations/channel-status";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getChannelAiSettingsForBusiness,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import type { AiManagerPageData } from "@/types/ai-manager.types";

function resolveActiveChannel(
  value: string | undefined,
): MessagingIntegrationChannelId | null {
  if (
    value &&
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(value)
  ) {
    return value as MessagingIntegrationChannelId;
  }

  return null;
}

export async function getAiManagerPageData(input?: {
  channel?: string;
}): Promise<AiManagerPageData> {
  const empty: AiManagerPageData = {
    hasBusiness: false,
    activeChannel: null,
    channelStatuses: buildIntegrationChannelStatuses({
      whatsappConnection: null,
      telegramConnection: null,
      websiteFormConnection: null,
      websiteKnowledgeSync: null,
      voiceConnection: null,
    }),
    channels: [],
    enabledChannelCount: 0,
    connectedChannelCount: 0,
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return empty;
  }

  const channelStatuses = await getChannelConnectionStatuses(business.id);
  const channels = await Promise.all(
    MESSAGING_INTEGRATION_CHANNELS.map(async (channel) => {
      const isChannelConnected = isChannelConnectedForWorkspace(
        channel,
        channelStatuses,
      );
      const settings = await getChannelAiSettingsForBusiness(
        business.id,
        channel,
        isChannelConnected,
      );

      return { channel, settings };
    }),
  );

  const enabledChannelCount = channels.filter(
    (entry) => entry.settings.aiEnabled,
  ).length;
  const connectedChannelCount = channels.filter(
    (entry) => entry.settings.isChannelConnected,
  ).length;

  return {
    hasBusiness: true,
    activeChannel: resolveActiveChannel(input?.channel),
    channelStatuses,
    channels,
    enabledChannelCount,
    connectedChannelCount,
  };
}
