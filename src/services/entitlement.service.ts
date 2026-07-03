import "server-only";

import { CUSTOMER_FACING_AI_CALL_TYPES } from "@/lib/ai/call-types";
import type { PlanEntitlements } from "@/features/subscription/entitlements";
import { isUnlimitedQuota } from "@/features/subscription/entitlements";
import {
  applyAddonEntitlementBoosts,
  getPlanEntitlementsForBusiness,
  getPlatformPlan,
  listPlatformAddons,
  parseBusinessSubscriptionAddons,
} from "@/services/platform-plans.service";
import {
  resolveSubscriptionPlan,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/features/subscription/plans";
import {
  isChannelConnectedForWorkspace,
  type IntegrationChannelStatusMap,
} from "@/features/integrations/channel-status";
import {
  MESSAGING_INTEGRATION_CHANNELS,
  type IntegrationChannelId,
  type MessagingIntegrationChannelId,
} from "@/features/integrations/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";

const BILLING_ACTIVE_STATUSES = new Set(["active", "trialing"]);

type EntitlementDenial = { allowed: false; message: string };
type EntitlementAllow = { allowed: true };

export type EntitlementResult = EntitlementAllow | EntitlementDenial;

type BusinessSubscriptionRow = {
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_addons: unknown;
};

async function getBusinessSubscription(
  businessId: string,
): Promise<{ planId: SubscriptionPlanId; status: string; entitlements: PlanEntitlements }> {
  if (!hasSupabaseEnv()) {
    const planId: SubscriptionPlanId = "free";
    return {
      planId,
      status: "active",
      entitlements: await getPlanEntitlementsForBusiness(planId),
    };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("subscription_plan, subscription_status, subscription_addons")
    .eq("id", businessId)
    .maybeSingle();

  const row = data as BusinessSubscriptionRow | null;
  const planId = resolveSubscriptionPlan(row?.subscription_plan);
  const status = row?.subscription_status?.trim().toLowerCase() || "active";
  const baseEntitlements = await getPlanEntitlementsForBusiness(planId);
  const activeAddons = parseBusinessSubscriptionAddons(row?.subscription_addons);
  const addonCatalog = await listPlatformAddons({ activeOnly: true });

  return {
    planId,
    status,
    entitlements: applyAddonEntitlementBoosts(
      baseEntitlements,
      activeAddons,
      addonCatalog,
    ),
  };
}

export async function getBusinessEntitlements(
  businessId: string,
): Promise<{
  planId: SubscriptionPlanId;
  planLabel: string;
  status: string;
  entitlements: PlanEntitlements;
}> {
  const subscription = await getBusinessSubscription(businessId);
  const planRecord = await getPlatformPlan(subscription.planId);

  return {
    planId: subscription.planId,
    planLabel: planRecord?.label ?? SUBSCRIPTION_PLANS[subscription.planId]?.label ?? subscription.planId,
    status: subscription.status,
    entitlements: subscription.entitlements,
  };
}

export async function assertSubscriptionBillingActive(
  businessId: string,
): Promise<EntitlementResult> {
  const { status, planId } = await getBusinessSubscription(businessId);

  if (planId === "free") {
    return { allowed: true };
  }

  if (BILLING_ACTIVE_STATUSES.has(status)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message:
      "Your subscription payment is past due. Update billing in Subscription settings to restore AI features.",
  };
}

export async function assertAiReplyQuota(
  businessId: string,
): Promise<EntitlementResult> {
  const billing = await assertSubscriptionBillingActive(businessId);
  if (!billing.allowed) return billing;

  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);
  const limit = entitlements.monthlyAiReplies;

  if (isUnlimitedQuota(limit)) {
    return { allowed: true };
  }

  const used = await countCustomerFacingAiRepliesThisMonth(businessId);

  if (used >= limit) {
    return {
      allowed: false,
      message: `Monthly AI reply limit reached (${limit.toLocaleString()} on ${planLabel}). Upgrade your plan or add an AI Reply Pack.`,
    };
  }

  return { allowed: true };
}

export async function assertVoiceAiAllowed(
  businessId: string,
): Promise<EntitlementResult> {
  const billing = await assertSubscriptionBillingActive(businessId);
  if (!billing.allowed) return billing;

  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);

  if (!entitlements.voiceAi) {
    return {
      allowed: false,
      message: `Voice AI is available on Pro and Agency plans. Current plan: ${planLabel}.`,
    };
  }

  if (entitlements.monthlyVoiceMinutes <= 0) {
    return { allowed: true };
  }

  const usedMinutes = await countVoiceMinutesThisMonth(businessId);

  if (usedMinutes >= entitlements.monthlyVoiceMinutes) {
    return {
      allowed: false,
      message: `Monthly voice AI limit reached (${entitlements.monthlyVoiceMinutes} min on ${planLabel}). Add a Voice Minutes Pack or upgrade.`,
    };
  }

  return { allowed: true };
}

export async function assertAutomationsAllowed(
  businessId: string,
): Promise<EntitlementResult> {
  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);

  if (!entitlements.automations) {
    return {
      allowed: false,
      message: `Automations start on the Starter plan. Current plan: ${planLabel}.`,
    };
  }

  return { allowed: true };
}

export async function assertCanCreateAutomation(
  businessId: string,
): Promise<EntitlementResult> {
  const base = await assertAutomationsAllowed(businessId);
  if (!base.allowed) return base;

  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);
  const limit = entitlements.maxAutomationRules;

  if (isUnlimitedQuota(limit) || limit === 0) {
    return limit === 0 ? base : { allowed: true };
  }

  const count = await countAutomationRules(businessId);

  if (count >= limit) {
    return {
      allowed: false,
      message: `Automation limit reached (${limit} rules on ${planLabel}). Upgrade to Pro for unlimited automations.`,
    };
  }

  return { allowed: true };
}

export async function assertAnalyticsAiAskAllowed(
  businessId: string,
): Promise<EntitlementResult> {
  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);

  if (!entitlements.analyticsAiAsk) {
    return {
      allowed: false,
      message: `Analytics AI insights are available on Pro and Agency plans. Current plan: ${planLabel}.`,
    };
  }

  return { allowed: true };
}

export async function assertFollowUpAgentAllowed(
  businessId: string,
): Promise<EntitlementResult> {
  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);

  if (!entitlements.followUpAgent) {
    return {
      allowed: false,
      message: `Follow-up AI agent is available on Pro and Agency plans. Current plan: ${planLabel}.`,
    };
  }

  return { allowed: true };
}

export async function assertCanConnectIntegration(
  businessId: string,
  channel: IntegrationChannelId,
): Promise<EntitlementResult> {
  const { entitlements, planLabel } = await getBusinessEntitlements(businessId);
  const statuses = await getChannelConnectionStatuses(businessId);

  if (channel === "email" && !entitlements.gmailIntegration) {
    return {
      allowed: false,
      message: `Gmail integration is available on Pro and Agency plans. Current plan: ${planLabel}.`,
    };
  }

  if (channel === "voice") {
    return assertVoiceAiAllowed(businessId);
  }

  if (channel === "website_knowledge" && !entitlements.websiteKnowledgeSync) {
    return {
      allowed: false,
      message: `Website knowledge sync starts on Starter. Current plan: ${planLabel}.`,
    };
  }

  if (!isMessagingIntegrationChannel(channel)) {
    return { allowed: true };
  }

  if (isChannelConnectedForWorkspace(channel, statuses)) {
    return { allowed: true };
  }

  const connectedCount = countConnectedMessagingChannels(statuses);
  const limit = entitlements.maxMessagingChannels;

  if (isUnlimitedQuota(limit) || connectedCount < limit) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Messaging channel limit reached (${limit} on ${planLabel}). Upgrade to connect more channels.`,
  };
}

function isMessagingIntegrationChannel(
  channel: IntegrationChannelId,
): channel is MessagingIntegrationChannelId {
  return (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel);
}

export function countConnectedMessagingChannels(
  statuses: IntegrationChannelStatusMap,
): number {
  return MESSAGING_INTEGRATION_CHANNELS.filter((channel) =>
    isChannelConnectedForWorkspace(channel, statuses),
  ).length;
}

function getMonthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function countCustomerFacingAiRepliesThisMonth(
  businessId: string,
): Promise<number> {
  if (!hasSupabaseEnv()) return 0;

  const admin = createAdminClient();
  const callTypes = Array.from(CUSTOMER_FACING_AI_CALL_TYPES);
  const { count } = await admin
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("billing_source", "platform")
    .in("call_type", callTypes)
    .gte("created_at", getMonthStartIso());

  return count ?? 0;
}

export async function countVoiceMinutesThisMonth(businessId: string): Promise<number> {
  if (!hasSupabaseEnv()) return 0;

  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_call_logs")
    .select("duration_seconds")
    .eq("business_id", businessId)
    .gte("created_at", getMonthStartIso());

  const totalSeconds = (data ?? []).reduce(
    (sum, row) => sum + Number(row.duration_seconds ?? 0),
    0,
  );

  return Math.ceil(totalSeconds / 60);
}

async function countAutomationRules(businessId: string): Promise<number> {
  if (!hasSupabaseEnv()) return 0;

  const admin = createAdminClient();
  const { count } = await admin
    .from("automations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  return count ?? 0;
}

export async function getUsageSnapshot(businessId: string): Promise<{
  usedAiReplies: number;
  monthlyAiLimit: number;
  usedVoiceMinutes: number;
  monthlyVoiceLimit: number;
  connectedChannels: number;
  maxChannels: number;
  automationCount: number;
  maxAutomations: number;
}> {
  const { entitlements } = await getBusinessEntitlements(businessId);
  const statuses = await getChannelConnectionStatuses(businessId);

  const [usedAiReplies, usedVoiceMinutes, automationCount] = await Promise.all([
    countCustomerFacingAiRepliesThisMonth(businessId),
    countVoiceMinutesThisMonth(businessId),
    countAutomationRules(businessId),
  ]);

  return {
    usedAiReplies,
    monthlyAiLimit: entitlements.monthlyAiReplies,
    usedVoiceMinutes,
    monthlyVoiceLimit: entitlements.monthlyVoiceMinutes,
    connectedChannels: countConnectedMessagingChannels(statuses),
    maxChannels: entitlements.maxMessagingChannels,
    automationCount,
    maxAutomations: entitlements.maxAutomationRules,
  };
}
