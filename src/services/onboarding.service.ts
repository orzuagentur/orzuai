import "server-only";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  type MessagingIntegrationChannelId,
} from "@/features/integrations";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
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

const REQUIRED_STEP_COUNT = 3;

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

async function buildOnboardingProgress(
  businessId: string,
  knowledgeCount: number,
): Promise<OnboardingProgress> {
  const channelStatuses = await getChannelConnectionStatuses(businessId);
  const connectedChannel = getFirstConnectedChannel(channelStatuses);
  const hasConnectedChannel = connectedChannel !== null;
  const hasKnowledgeEntry = knowledgeCount > 0;
  const channelAiSettings =
    connectedChannel !== null
      ? await getChannelAiSettings(connectedChannel)
      : null;
  const hasAiEnabled = channelAiSettings?.aiEnabled === true;

  let requiredDone = 1;
  if (hasConnectedChannel) requiredDone += 1;
  if (hasAiEnabled) requiredDone += 1;

  const isComplete = hasConnectedChannel && hasAiEnabled;
  const percentComplete = isComplete
    ? 100
    : Math.round((requiredDone / REQUIRED_STEP_COUNT) * 100);

  let recommendedStep = 1;
  if (!hasConnectedChannel) {
    recommendedStep = 2;
  } else if (!hasAiEnabled) {
    recommendedStep = 3;
  } else {
    recommendedStep = 3;
  }

  return {
    hasBusiness: true,
    hasConnectedChannel,
    hasKnowledgeEntry,
    hasAiEnabled,
    connectedChannel,
    percentComplete,
    isComplete,
    recommendedStep,
  };
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
      percentComplete: 33,
      isComplete: false,
      recommendedStep: 2,
    };
  }

  const supabase = await createClient();
  const knowledgeResult = await supabase
    .from("knowledge_base")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return buildOnboardingProgress(businessId, knowledgeResult.count ?? 0);
}

/** Service-role onboarding check for cron jobs and background email logic. */
export async function getOnboardingProgressForSystem(
  businessId: string,
): Promise<OnboardingProgress> {
  if (!hasSupabaseEnv()) {
    return getEmptyOnboardingProgress();
  }

  const admin = createAdminClient();
  const knowledgeResult = await admin
    .from("knowledge_base")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return buildOnboardingProgress(businessId, knowledgeResult.count ?? 0);
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
