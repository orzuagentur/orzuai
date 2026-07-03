import type { SubscriptionPlanId } from "./plans";

/** Sentinel for unlimited quotas. */
export const UNLIMITED_QUOTA = -1;

/**
 * Internal unit economics (USD, conservative estimates):
 * - Customer-facing AI reply (Gemini + orchestrator): ~$0.004
 * - Voice AI minute (Twilio + Deepgram + LLM + TTS): ~$0.09
 * - Platform overhead per active tenant: ~$1.50/mo (Supabase, Vercel, QStash)
 *
 * Target blended gross margin: 55–85% depending on tier.
 */
export const ORZUX_UNIT_ECONOMICS = {
  aiReplyCostUsd: 0.004,
  voiceMinuteCostUsd: 0.09,
  platformOverheadUsd: 1.5,
} as const;

export type PlanEntitlements = {
  maxMessagingChannels: number;
  maxTeamSeats: number;
  monthlyAiReplies: number;
  monthlyVoiceMinutes: number;
  maxAutomationRules: number;
  voiceAi: boolean;
  automations: boolean;
  followUpAgent: boolean;
  analyticsAiAsk: boolean;
  gmailIntegration: boolean;
  websiteKnowledgeSync: boolean;
  extendedAiContext: boolean;
  calendarBookingPages: boolean;
  prioritySupport: boolean;
};

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlanId, PlanEntitlements> = {
  free: {
    maxMessagingChannels: 1,
    maxTeamSeats: 1,
    monthlyAiReplies: 150,
    monthlyVoiceMinutes: 0,
    maxAutomationRules: 0,
    voiceAi: false,
    automations: false,
    followUpAgent: false,
    analyticsAiAsk: false,
    gmailIntegration: false,
    websiteKnowledgeSync: false,
    extendedAiContext: false,
    calendarBookingPages: true,
    prioritySupport: false,
  },
  starter: {
    maxMessagingChannels: 3,
    maxTeamSeats: 3,
    monthlyAiReplies: 1_500,
    monthlyVoiceMinutes: 0,
    maxAutomationRules: 5,
    voiceAi: false,
    automations: true,
    followUpAgent: false,
    analyticsAiAsk: false,
    gmailIntegration: false,
    websiteKnowledgeSync: true,
    extendedAiContext: false,
    calendarBookingPages: true,
    prioritySupport: false,
  },
  pro: {
    maxMessagingChannels: 6,
    maxTeamSeats: 10,
    monthlyAiReplies: 6_000,
    monthlyVoiceMinutes: 300,
    maxAutomationRules: UNLIMITED_QUOTA,
    voiceAi: true,
    automations: true,
    followUpAgent: true,
    analyticsAiAsk: true,
    gmailIntegration: true,
    websiteKnowledgeSync: true,
    extendedAiContext: true,
    calendarBookingPages: true,
    prioritySupport: false,
  },
  agency: {
    maxMessagingChannels: UNLIMITED_QUOTA,
    maxTeamSeats: 25,
    monthlyAiReplies: 20_000,
    monthlyVoiceMinutes: 800,
    maxAutomationRules: UNLIMITED_QUOTA,
    voiceAi: true,
    automations: true,
    followUpAgent: true,
    analyticsAiAsk: true,
    gmailIntegration: true,
    websiteKnowledgeSync: true,
    extendedAiContext: true,
    calendarBookingPages: true,
    prioritySupport: true,
  },
};

export function getPlanEntitlements(planId: SubscriptionPlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[planId];
}

export function isUnlimitedQuota(value: number): boolean {
  return value < 0;
}

export function estimateMonthlyAiCostUsd(replies: number): number {
  return Number((replies * ORZUX_UNIT_ECONOMICS.aiReplyCostUsd).toFixed(2));
}

export function estimateMonthlyVoiceCostUsd(minutes: number): number {
  return Number((minutes * ORZUX_UNIT_ECONOMICS.voiceMinuteCostUsd).toFixed(2));
}

export function estimatePlanInfrastructureCostUsd(
  entitlements: PlanEntitlements,
): number {
  const aiCost = isUnlimitedQuota(entitlements.monthlyAiReplies)
    ? 0
    : estimateMonthlyAiCostUsd(entitlements.monthlyAiReplies);
  const voiceCost = estimateMonthlyVoiceCostUsd(entitlements.monthlyVoiceMinutes);

  return Number(
    (ORZUX_UNIT_ECONOMICS.platformOverheadUsd + aiCost + voiceCost).toFixed(2),
  );
}
