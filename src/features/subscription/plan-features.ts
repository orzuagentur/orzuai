import {
  getPlanEntitlements,
  isUnlimitedQuota,
  type PlanEntitlements,
} from "./entitlements";
import type { SubscriptionPlanId } from "./plans";

export function buildPlanFeaturesFromEntitlements(
  entitlements: PlanEntitlements,
): string[] {
  const features: string[] = [
    isUnlimitedQuota(entitlements.monthlyAiReplies)
      ? "Unlimited AI replies"
      : `${entitlements.monthlyAiReplies.toLocaleString("en-US")} AI replies / month`,
    isUnlimitedQuota(entitlements.maxMessagingChannels)
      ? "Unlimited messaging channels"
      : `${entitlements.maxMessagingChannels} messaging channel${entitlements.maxMessagingChannels === 1 ? "" : "s"}`,
    `${entitlements.maxTeamSeats} team seat${entitlements.maxTeamSeats === 1 ? "" : "s"}`,
    "Unified inbox + CRM + calendar",
  ];

  if (entitlements.websiteKnowledgeSync) {
    features.push("Website knowledge sync");
  }

  if (entitlements.gmailIntegration) {
    features.push("Gmail inbox integration");
  }

  if (entitlements.voiceAi) {
    features.push(
      entitlements.monthlyVoiceMinutes > 0
        ? `Calls AI - ${entitlements.monthlyVoiceMinutes} min / month`
        : "Calls AI agent",
    );
  } else {
    features.push("Calls AI - upgrade to Pro");
  }

  if (entitlements.followUpAgent) {
    features.push("Follow-up AI agent");
  }

  if (entitlements.analyticsAiAsk) {
    features.push("Analytics + AI insights");
  } else {
    features.push("Analytics dashboard");
  }

  if (entitlements.extendedAiContext) {
    features.push("Extended AI conversation memory");
  }

  if (entitlements.prioritySupport) {
    features.push("Priority support");
  }

  return features;
}

/** @deprecated Use buildPlanFeaturesFromEntitlements — kept for static plans.ts seed */
export function buildPlanFeatures(planId: SubscriptionPlanId): string[] {
  return buildPlanFeaturesFromEntitlements(getPlanEntitlements(planId));
}
