import {
  getPlanEntitlements,
  isUnlimitedQuota,
  PLAN_ENTITLEMENTS,
  UNLIMITED_QUOTA,
} from "./entitlements";

export const UNLIMITED_AI_REPLIES = UNLIMITED_QUOTA;

export const SUBSCRIPTION_PLAN_IDS = ["free", "starter", "pro", "agency"] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

function formatChannelLimit(maxMessagingChannels: number): string {
  return isUnlimitedQuota(maxMessagingChannels)
    ? "Unlimited messaging channels"
    : `${maxMessagingChannels} messaging channel${maxMessagingChannels === 1 ? "" : "s"}`;
}

function formatAutomationLimit(maxAutomationRules: number): string {
  if (maxAutomationRules === 0) return "Automations not included";
  if (isUnlimitedQuota(maxAutomationRules)) return "Unlimited automations";
  return `Up to ${maxAutomationRules} automation rules`;
}

function buildPlanFeatures(planId: SubscriptionPlanId): string[] {
  const entitlements = getPlanEntitlements(planId);

  const features = [
    isUnlimitedQuota(entitlements.monthlyAiReplies)
      ? "Unlimited AI replies"
      : `${entitlements.monthlyAiReplies.toLocaleString("en-US")} AI replies / month`,
    formatChannelLimit(entitlements.maxMessagingChannels),
    `${entitlements.maxTeamSeats} team seat${entitlements.maxTeamSeats === 1 ? "" : "s"}`,
    "Unified inbox + CRM + calendar",
    formatAutomationLimit(entitlements.maxAutomationRules),
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
        ? `Voice AI - ${entitlements.monthlyVoiceMinutes} min / month`
        : "Voice AI agent",
    );
  } else {
    features.push("Voice AI - upgrade to Pro");
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

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanId,
  {
    label: string;
    tagline: string;
    monthlyAiReplies: number;
    priceMonthly: number;
    features: string[];
    highlighted?: boolean;
    entitlements: (typeof PLAN_ENTITLEMENTS)[SubscriptionPlanId];
  }
> = {
  free: {
    label: "Free",
    tagline: "Launch your first AI inbox",
    monthlyAiReplies: PLAN_ENTITLEMENTS.free.monthlyAiReplies,
    priceMonthly: 0,
    features: buildPlanFeatures("free"),
    entitlements: PLAN_ENTITLEMENTS.free,
  },
  starter: {
    label: "Starter",
    tagline: "For growing local businesses",
    monthlyAiReplies: PLAN_ENTITLEMENTS.starter.monthlyAiReplies,
    priceMonthly: 49,
    features: buildPlanFeatures("starter"),
    entitlements: PLAN_ENTITLEMENTS.starter,
  },
  pro: {
    label: "Pro",
    tagline: "Voice AI + full automation stack",
    monthlyAiReplies: PLAN_ENTITLEMENTS.pro.monthlyAiReplies,
    priceMonthly: 129,
    highlighted: true,
    features: buildPlanFeatures("pro"),
    entitlements: PLAN_ENTITLEMENTS.pro,
  },
  agency: {
    label: "Agency",
    tagline: "High-volume teams & partners",
    monthlyAiReplies: PLAN_ENTITLEMENTS.agency.monthlyAiReplies,
    priceMonthly: 349,
    features: buildPlanFeatures("agency"),
    entitlements: PLAN_ENTITLEMENTS.agency,
  },
};

export function isUnlimitedAiReplies(monthlyLimit: number): boolean {
  return isUnlimitedQuota(monthlyLimit);
}

/** Resolves stored plan slug; unknown values are preserved for DB-driven plans. */
export function resolveSubscriptionPlan(
  plan: string | null | undefined,
): SubscriptionPlanId {
  const normalized = plan?.trim().toLowerCase();

  if (!normalized) {
    return "free";
  }

  if ((SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(normalized)) {
    return normalized as SubscriptionPlanId;
  }

  return normalized as SubscriptionPlanId;
}
