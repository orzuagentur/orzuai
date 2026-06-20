import "server-only";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  type MessagingIntegrationChannelId,
} from "@/features/integrations";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  getChannelAiSettings,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";

export type OnboardingProgress = {
  hasBusiness: boolean;
  hasConnectedChannel: boolean;
  hasKnowledgeEntry: boolean;
  hasAiEnabled: boolean;
  connectedChannel: MessagingIntegrationChannelId | null;
  percentComplete: number;
  isComplete: boolean;
  recommendedStep: number;
};

const STEP_PERCENT = 20;

function getFirstConnectedChannel(
  statuses: Awaited<ReturnType<typeof getChannelConnectionStatuses>>,
): MessagingIntegrationChannelId | null {
  for (const channel of MESSAGING_INTEGRATION_CHANNELS) {
    if (statuses[channel]?.status === "connected") {
      return channel;
    }
  }

  return null;
}

export async function getOnboardingProgress(
  businessId: string,
): Promise<OnboardingProgress> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: true,
      hasConnectedChannel: false,
      hasKnowledgeEntry: false,
      hasAiEnabled: false,
      connectedChannel: null,
      percentComplete: STEP_PERCENT,
      isComplete: false,
      recommendedStep: 2,
    };
  }

  const supabase = await createClient();
  const [channelStatuses, knowledgeResult] = await Promise.all([
    getChannelConnectionStatuses(businessId),
    supabase
      .from("knowledge_base")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
  ]);

  const connectedChannel = getFirstConnectedChannel(channelStatuses);
  const hasConnectedChannel = connectedChannel !== null;
  const hasKnowledgeEntry = (knowledgeResult.count ?? 0) > 0;
  const channelAiSettings =
    connectedChannel !== null
      ? await getChannelAiSettings(connectedChannel)
      : null;
  const hasAiEnabled = channelAiSettings?.aiEnabled === true;

  let completedSteps = 1;

  if (hasConnectedChannel) {
    completedSteps += 1;
  }

  if (hasKnowledgeEntry) {
    completedSteps += 1;
  }

  if (hasAiEnabled) {
    completedSteps += 1;
  }

  const percentComplete = Math.min(completedSteps * STEP_PERCENT, 80);
  const isComplete = hasConnectedChannel && hasAiEnabled;

  let recommendedStep = 2;

  if (!hasConnectedChannel) {
    recommendedStep = 2;
  } else if (!hasKnowledgeEntry) {
    recommendedStep = 3;
  } else if (!hasAiEnabled) {
    recommendedStep = 4;
  } else {
    recommendedStep = 5;
  }

  return {
    hasBusiness: true,
    hasConnectedChannel,
    hasKnowledgeEntry,
    hasAiEnabled,
    connectedChannel,
    percentComplete: isComplete ? 100 : percentComplete,
    isComplete,
    recommendedStep,
  };
}

export function getEmptyOnboardingProgress(): OnboardingProgress {
  return {
    hasBusiness: false,
    hasConnectedChannel: false,
    hasKnowledgeEntry: false,
    hasAiEnabled: false,
    connectedChannel: null,
    percentComplete: 0,
    isComplete: false,
    recommendedStep: 1,
  };
}
