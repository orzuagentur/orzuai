import "server-only";

import { estimateAiCostUsd } from "@/lib/ai/cost";
import type { AiCallType } from "@/lib/ai/call-types";
import type { AiProvider } from "@/lib/ai/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isUnlimitedAiReplies,
  resolveSubscriptionPlan,
  SUBSCRIPTION_PLANS,
  UNLIMITED_AI_REPLIES,
  type SubscriptionPlanId,
} from "@/features/subscription/plans";
import { businessHasCustomAiCredentials } from "@/services/business-ai-credentials.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import type { AiCostMetrics, AiUsageSummary } from "@/types/ai-usage.types";

function getMonthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function getBusinessPlan(
  businessId: string,
): Promise<SubscriptionPlanId> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  return resolveSubscriptionPlan(data?.subscription_plan);
}

export async function assertAiUsageAllowed(
  businessId: string,
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { allowed: true };
  }

  const plan = await getBusinessPlan(businessId);
  const limit = SUBSCRIPTION_PLANS[plan].monthlyAiReplies;

  if (isUnlimitedAiReplies(limit)) {
    return { allowed: true };
  }

  const summary = await getAiUsageSummaryForBusiness(businessId, plan);

  if (summary.usedReplies >= limit) {
    return {
      allowed: false,
      message: `Monthly AI reply limit reached (${limit} on ${summary.planLabel}). Upgrade your plan to continue.`,
    };
  }

  return { allowed: true };
}

export async function logAiUsage(input: {
  businessId: string;
  conversationId?: string | null;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  billingSource?: "platform" | "customer";
  callType?: AiCallType;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();
  const estimatedCostUsd = estimateAiCostUsd({
    provider: input.provider,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  });

  await admin.from("ai_usage_logs").insert({
    business_id: input.businessId,
    conversation_id: input.conversationId ?? null,
    provider: input.provider,
    model: input.model,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    estimated_cost_usd: estimatedCostUsd,
    billing_source: input.billingSource ?? "platform",
    call_type: input.callType ?? "other",
  });
}

export async function getAiUsageSummaryForBusiness(
  businessId: string,
  plan?: SubscriptionPlanId,
): Promise<AiUsageSummary> {
  const resolvedPlan = plan ?? (await getBusinessPlan(businessId));
  const planConfig = SUBSCRIPTION_PLANS[resolvedPlan];
  const monthStart = getMonthStartIso();

  if (!hasSupabaseEnv()) {
    return {
      planId: resolvedPlan,
      planLabel: planConfig.label,
      monthlyLimit: planConfig.monthlyAiReplies,
      usedReplies: 0,
      remainingReplies: planConfig.monthlyAiReplies,
      usagePercent: 0,
    };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("billing_source", "platform")
    .gte("created_at", monthStart);

  const usedReplies = count ?? 0;
  const unlimited = isUnlimitedAiReplies(planConfig.monthlyAiReplies);
  const remainingReplies = unlimited
    ? UNLIMITED_AI_REPLIES
    : Math.max(0, planConfig.monthlyAiReplies - usedReplies);
  const usagePercent =
    unlimited || planConfig.monthlyAiReplies <= 0
      ? 0
      : Math.min(
          100,
          Math.round((usedReplies / planConfig.monthlyAiReplies) * 100),
        );

  return {
    planId: resolvedPlan,
    planLabel: planConfig.label,
    monthlyLimit: planConfig.monthlyAiReplies,
    usedReplies,
    remainingReplies,
    usagePercent,
  };
}

export async function getAiUsageSummary(): Promise<AiUsageSummary | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return null;
  }

  return getAiUsageSummaryForBusiness(business.id);
}

export async function getAiCostMetrics(
  businessId: string,
): Promise<AiCostMetrics> {
  const empty: AiCostMetrics = {
    totalCostUsd: 0,
    monthCostUsd: 0,
    totalReplies: 0,
    monthReplies: 0,
    avgCostPerReplyUsd: 0,
    byProvider: [],
    hasCustomBilling: false,
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const admin = createAdminClient();
  const monthStart = getMonthStartIso();

  const hasCustomBilling = await businessHasCustomAiCredentials(businessId);

  const { data: allLogs } = await admin
    .from("ai_usage_logs")
    .select("provider, estimated_cost_usd, created_at")
    .eq("business_id", businessId)
    .eq("billing_source", "customer");

  const logs = allLogs ?? [];
  const monthLogs = logs.filter((log) => log.created_at >= monthStart);
  const totalCostUsd = logs.reduce(
    (sum, log) => sum + Number(log.estimated_cost_usd ?? 0),
    0,
  );
  const monthCostUsd = monthLogs.reduce(
    (sum, log) => sum + Number(log.estimated_cost_usd ?? 0),
    0,
  );

  const providerTotals = new Map<string, { replies: number; costUsd: number }>();

  for (const log of monthLogs) {
    const current = providerTotals.get(log.provider) ?? { replies: 0, costUsd: 0 };
    providerTotals.set(log.provider, {
      replies: current.replies + 1,
      costUsd: current.costUsd + Number(log.estimated_cost_usd ?? 0),
    });
  }

  return {
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    monthCostUsd: Number(monthCostUsd.toFixed(4)),
    totalReplies: logs.length,
    monthReplies: monthLogs.length,
    avgCostPerReplyUsd:
      monthLogs.length > 0
        ? Number((monthCostUsd / monthLogs.length).toFixed(6))
        : 0,
    byProvider: Array.from(providerTotals.entries()).map(([provider, stats]) => ({
      provider,
      replies: stats.replies,
      costUsd: Number(stats.costUsd.toFixed(4)),
    })),
    hasCustomBilling,
  };
}

export async function getBusinessSubscriptionPlan(
  businessId: string,
): Promise<SubscriptionPlanId> {
  return getBusinessPlan(businessId);
}
