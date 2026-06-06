import "server-only";

import { generateText } from "@/services/llm.service";
import {
  getAiCostMetrics,
  getAiUsageSummaryForBusiness,
  getBusinessSubscriptionPlan,
} from "@/services/ai-usage.service";
import {
  getAiPerformanceMetrics,
  getCrmFunnelMetrics,
  getLeadSourceAttribution,
  getResponseTimeMetrics,
} from "@/services/analytics.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { hasSupabaseEnv } from "@/lib/env";
import { SUBSCRIPTION_PLANS } from "@/features/subscription/plans";

export async function askAnalyticsAssistant(input: {
  question: string;
}): Promise<{ success: true; answer: string } | { success: false; message: string }> {
  const question = input.question.trim();

  if (!question) {
    return { success: false, message: "Enter a question about your analytics." };
  }

  if (question.length > 500) {
    return { success: false, message: "Question is too long." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Business not found." };
  }

  const plan = await getBusinessSubscriptionPlan(business.id);
  const [
    aiPerformance,
    leadSources,
    responseTime,
    crmFunnel,
    aiCost,
    usage,
  ] = await Promise.all([
    getAiPerformanceMetrics(business.id),
    getLeadSourceAttribution(business.id),
    getResponseTimeMetrics(business.id),
    getCrmFunnelMetrics(business.id),
    getAiCostMetrics(business.id),
    getAiUsageSummaryForBusiness(business.id, plan),
  ]);

  const context = {
    plan: SUBSCRIPTION_PLANS[plan].label,
    aiPerformance,
    leadSources,
    responseTime,
    crmFunnel,
    aiCost,
    usage,
  };

  const aiResult = await generateText({
    businessId: business.id,
    skipUsageLog: false,
    prompt: [
      "You are an analytics assistant for a small business CRM.",
      "Use ONLY the JSON metrics below. Be concise and actionable.",
      "If data is missing, say what to connect or collect first.",
      "",
      `Metrics JSON:\n${JSON.stringify(context)}`,
      "",
      `Question: ${question}`,
    ].join("\n"),
    systemInstruction:
      "Answer in plain language with 2-4 short paragraphs or bullet points. No markdown headers.",
  });

  if (!aiResult.success) {
    return { success: false, message: aiResult.error.message };
  }

  return { success: true, answer: aiResult.data.text };
}
