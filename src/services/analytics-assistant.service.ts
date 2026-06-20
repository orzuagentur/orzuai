import "server-only";

import { SUBSCRIPTION_PLANS } from "@/features/subscription/plans";
import { hasSupabaseEnv } from "@/lib/env";
import {
    getAutomationOpsMetrics,
    getAgentRunsMetrics,
    listAgentsAnalyticsRollup,
    listRecentAgentRuns,
  } from "@/services/analytics-ai-ops.service";
import {
  getAiPerformanceMetrics,
  getCrmFunnelMetrics,
  getLeadSourceAttribution,
  getResponseTimeMetrics,
  getRevenueMetrics,
  getSentimentBreakdown,
  getTeamAnalyticsMetrics,
} from "@/services/analytics.service";
import {
  getAiCostMetrics,
  getAiUsageSummaryForBusiness,
  getBusinessSubscriptionPlan,
} from "@/services/ai-usage.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateText } from "@/services/llm.service";

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
    teamAnalytics,
    revenue,
    sentiment,
    agentsRollup,
    automationOps,
    agentRuns,
    recentAgentRuns,
  ] = await Promise.all([
    getAiPerformanceMetrics(business.id),
    getLeadSourceAttribution(business.id),
    getResponseTimeMetrics(business.id),
    getCrmFunnelMetrics(business.id),
    getAiCostMetrics(business.id),
    getAiUsageSummaryForBusiness(business.id, plan),
    getTeamAnalyticsMetrics(business.id),
    getRevenueMetrics(business.id),
    getSentimentBreakdown(business.id),
    listAgentsAnalyticsRollup(business.id),
    getAutomationOpsMetrics(business.id),
    getAgentRunsMetrics(business.id),
    listRecentAgentRuns(business.id),
  ]);

  const context = {
    plan: SUBSCRIPTION_PLANS[plan].label,
    aiPerformance,
    teamAnalytics,
    leadSources,
    responseTime,
    crmFunnel,
    revenue,
    sentiment,
    aiCost,
    usage,
    agentsRollup,
    automationOps,
    agentRuns,
    recentAgentRuns,
  };

  const aiResult = await generateText({
    businessId: business.id,
    skipUsageLog: false,
    prompt: [
      "You are an analytics assistant for a small business CRM.",
      "Use ONLY the JSON metrics below. Be concise and actionable.",
      "Reference specific numbers when helpful. Suggest which product area to check (Inbox, CRM, Automations, AI Agents) when relevant.",
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
