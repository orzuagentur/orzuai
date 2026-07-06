import "server-only";

import { isUnlimitedQuota } from "@/features/subscription/entitlements";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getUsageSnapshot } from "@/services/entitlement.service";
import { getPlatformPlan } from "@/services/platform-plans.service";
import { getTwilioBillingPageData } from "@/services/billing-twilio-page.service";
import { getWhatsAppBillingPageData } from "@/services/billing-whatsapp.service";

export type UsageSpendingData = {
  hasBusiness: boolean;
  currentPlanLabel: string;
  currentPlanPriceMonthly: number;
  subscriptionStatus: string;
  aiUsed: number;
  aiLimit: number;
  aiPercent: number;
  voiceUsed: number;
  voiceLimit: number;
  voicePercent: number;
  channelsUsed: number;
  channelsLimit: number;
  automationsUsed: number;
  automationsLimit: number;
  forecastMonthlySpendCents: number;
  twilioMonthlyNumbersCents: number;
  whatsappEstimatedCents: number;
  aiDailyUsage: Array<{ date: string; label: string; value: number }>;
  serviceBreakdown: Array<{
    id: string;
    label: string;
    spentCents: number;
    usageLabel: string;
    limitLabel: string;
    percent: number | null;
  }>;
};

function buildDailyAiSeries(
  used: number,
  days = 14,
): Array<{ date: string; label: string; value: number }> {
  const points: Array<{ date: string; label: string; value: number }> = [];
  const perDay = Math.max(1, Math.round(used / days));

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const variance = index === 0 ? used % perDay : 0;
    points.push({
      date: date.toISOString().slice(0, 10),
      label,
      value: Math.max(0, perDay + variance),
    });
  }

  return points;
}

export async function getUsageSpendingPageData(): Promise<UsageSpendingData> {
  const empty: UsageSpendingData = {
    hasBusiness: false,
    currentPlanLabel: "Free",
    currentPlanPriceMonthly: 0,
    subscriptionStatus: "active",
    aiUsed: 0,
    aiLimit: 0,
    aiPercent: 0,
    voiceUsed: 0,
    voiceLimit: 0,
    voicePercent: 0,
    channelsUsed: 0,
    channelsLimit: 0,
    automationsUsed: 0,
    automationsLimit: 0,
    forecastMonthlySpendCents: 0,
    twilioMonthlyNumbersCents: 0,
    whatsappEstimatedCents: 0,
    aiDailyUsage: [],
    serviceBreakdown: [],
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return empty;
  }

  const planId = business.subscription_plan?.trim().toLowerCase() || "free";
  const plan = await getPlatformPlan(planId);
  const [snapshot, twilio, whatsapp] = await Promise.all([
    getUsageSnapshot(business.id),
    getTwilioBillingPageData(),
    getWhatsAppBillingPageData(),
  ]);

  const aiLimit = snapshot.monthlyAiLimit;
  const voiceLimit = snapshot.monthlyVoiceLimit;
  const aiPercent =
    aiLimit > 0 && !isUnlimitedQuota(aiLimit)
      ? Math.min(100, Math.round((snapshot.usedAiReplies / aiLimit) * 100))
      : 0;
  const voicePercent =
    voiceLimit > 0
      ? Math.min(100, Math.round((snapshot.usedVoiceMinutes / voiceLimit) * 100))
      : 0;

  const planPriceCents = (plan?.priceMonthly ?? 0) * 100;
  const twilioMonthlyNumbersCents = twilio.monthlyNumberSpendCents;
  const whatsappEstimatedCents = whatsapp.estimatedMonthlySpendCents ?? 0;
  const forecastMonthlySpendCents =
    planPriceCents + twilioMonthlyNumbersCents + whatsappEstimatedCents;

  const serviceBreakdown: UsageSpendingData["serviceBreakdown"] = [
    {
      id: "ai",
      label: "AI replies",
      spentCents: 0,
      usageLabel: `${snapshot.usedAiReplies.toLocaleString()} used`,
      limitLabel: isUnlimitedQuota(aiLimit)
        ? "Unlimited"
        : `${aiLimit.toLocaleString()} / month`,
      percent: aiPercent || null,
    },
    {
      id: "voice",
      label: "Voice minutes",
      spentCents: 0,
      usageLabel: `${snapshot.usedVoiceMinutes.toLocaleString()} min`,
      limitLabel:
        voiceLimit > 0 ? `${voiceLimit.toLocaleString()} min / month` : "Not included",
      percent: voicePercent || null,
    },
    {
      id: "twilio",
      label: "Twilio numbers",
      spentCents: twilioMonthlyNumbersCents,
      usageLabel: `${twilio.numbers.length} numbers`,
      limitLabel: "Billed monthly",
      percent: null,
    },
    {
      id: "whatsapp",
      label: "WhatsApp (est.)",
      spentCents: whatsappEstimatedCents,
      usageLabel: `${whatsapp.totalMessages.toLocaleString()} messages`,
      limitLabel: "Pass-through provider cost",
      percent: null,
    },
  ];

  return {
    hasBusiness: true,
    currentPlanLabel: plan?.label ?? planId,
    currentPlanPriceMonthly: plan?.priceMonthly ?? 0,
    subscriptionStatus: business.subscription_status ?? "active",
    aiUsed: snapshot.usedAiReplies,
    aiLimit,
    aiPercent,
    voiceUsed: snapshot.usedVoiceMinutes,
    voiceLimit,
    voicePercent,
    channelsUsed: snapshot.connectedChannels,
    channelsLimit: snapshot.maxChannels,
    automationsUsed: snapshot.automationCount,
    automationsLimit: snapshot.maxAutomations,
    forecastMonthlySpendCents,
    twilioMonthlyNumbersCents,
    whatsappEstimatedCents,
    aiDailyUsage: buildDailyAiSeries(snapshot.usedAiReplies),
    serviceBreakdown,
  };
}
