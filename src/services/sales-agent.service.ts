import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAiActionNotification } from "@/services/business-notifications.service";
import { generateText } from "@/services/llm.service";
import type {
  SalesAgentRuleTestResult,
  SalesAgentSettings,
} from "@/types/ai-usage.types";
import type { MessagingChannel } from "@/types/database.types";

type MessagingDbClient = ReturnType<typeof createAdminClient>;

const AUTO_DEAL_TITLE = "AI qualified lead";

const BANT_PROMPT = `Analyze this customer message for BANT sales qualification.
Return ONLY valid JSON with keys: budget (0-100), authority (0-100), need (0-100), timeline (0-100), summary (string), suggestedAction (string).
Message:`;

export function getDefaultSalesAgentSettings(): SalesAgentSettings {
  return {
    salesAgentEnabled: false,
    bantThreshold: 70,
    autoQualifyPipeline: true,
    autoTaskEnabled: false,
    autoTaskThreshold: 75,
    autoDealEnabled: false,
    autoDealThreshold: 70,
    sentimentAnalysisEnabled: true,
  };
}

export async function getSalesAgentSettings(
  businessId: string,
): Promise<SalesAgentSettings> {
  const defaults = getDefaultSalesAgentSettings();

  if (!hasSupabaseEnv()) {
    return defaults;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_ai_config")
    .select(
      "sales_agent_enabled, bant_threshold, auto_qualify_pipeline, auto_task_enabled, auto_task_threshold, auto_deal_enabled, auto_deal_threshold, sentiment_analysis_enabled",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return defaults;
  }

  return {
    salesAgentEnabled: data.sales_agent_enabled,
    bantThreshold: data.bant_threshold,
    autoQualifyPipeline: data.auto_qualify_pipeline,
    autoTaskEnabled: data.auto_task_enabled,
    autoTaskThreshold: data.auto_task_threshold,
    autoDealEnabled: data.auto_deal_enabled ?? false,
    autoDealThreshold: data.auto_deal_threshold ?? 70,
    sentimentAnalysisEnabled: data.sentiment_analysis_enabled,
  };
}

export async function saveSalesAgentSettings(
  businessId: string,
  settings: SalesAgentSettings,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("business_ai_config").upsert(
    {
      business_id: businessId,
      sales_agent_enabled: settings.salesAgentEnabled,
      bant_threshold: settings.bantThreshold,
      auto_qualify_pipeline: settings.autoQualifyPipeline,
      auto_task_enabled: settings.autoTaskEnabled,
      auto_task_threshold: settings.autoTaskThreshold,
      auto_deal_enabled: settings.autoDealEnabled,
      auto_deal_threshold: settings.autoDealThreshold,
      sentiment_analysis_enabled: settings.sentimentAnalysisEnabled,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

type BantEvaluation = {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
  summary: string;
  suggestedAction: string;
};

function parseBantResponse(text: string): BantEvaluation | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<BantEvaluation>;
    const score = (value: unknown) =>
      typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;

    return {
      budget: score(parsed.budget),
      authority: score(parsed.authority),
      need: score(parsed.need),
      timeline: score(parsed.timeline),
      summary:
        typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "",
      suggestedAction:
        typeof parsed.suggestedAction === "string"
          ? parsed.suggestedAction.slice(0, 300)
          : "",
    };
  } catch {
    return null;
  }
}

function averageBantScore(evaluation: BantEvaluation): number {
  return Math.round(
    (evaluation.budget +
      evaluation.authority +
      evaluation.need +
      evaluation.timeline) /
      4,
  );
}

function buildPlannedActions(
  settings: SalesAgentSettings,
  averageScore: number,
): string[] {
  const actions: string[] = [`Update lead score to ${averageScore}`];

  if (settings.autoQualifyPipeline && averageScore >= settings.bantThreshold) {
    actions.push("Move contact to Qualified pipeline");
  }

  if (settings.autoTaskEnabled && averageScore >= settings.autoTaskThreshold) {
    actions.push("Create high-intent CRM task");
  }

  if (settings.autoDealEnabled && averageScore >= settings.autoDealThreshold) {
    actions.push(`Create CRM deal "${AUTO_DEAL_TITLE}"`);
    actions.push("Notify owner about AI-qualified deal");
  }

  return actions;
}

async function evaluateBant(
  businessId: string,
  message: string,
): Promise<
  | { success: true; evaluation: BantEvaluation; averageScore: number }
  | { success: false; message: string }
> {
  const aiResult = await generateText({
    businessId,
    callType: "bant",
    prompt: `${BANT_PROMPT}\n${message}`,
    systemInstruction:
      "You are a B2B sales analyst. Score BANT dimensions from 0 to 100.",
  });

  if (!aiResult.success) {
    return {
      success: false,
      message: aiResult.error.message || "BANT evaluation failed.",
    };
  }

  const evaluation = parseBantResponse(aiResult.data.text);

  if (!evaluation) {
    return { success: false, message: "Could not parse BANT response." };
  }

  return {
    success: true,
    evaluation,
    averageScore: averageBantScore(evaluation),
  };
}

export async function dryRunSalesAgentRules(input: {
  businessId: string;
  message: string;
}): Promise<SalesAgentRuleTestResult> {
  const settings = await getSalesAgentSettings(input.businessId);

  if (!settings.salesAgentEnabled) {
    return {
      success: true,
      averageScore: 0,
      plannedActions: ["Sales agent is disabled — no actions would run."],
      message: "Sales agent disabled.",
    };
  }

  const result = await evaluateBant(input.businessId, input.message);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    averageScore: result.averageScore,
    evaluation: result.evaluation,
    plannedActions: buildPlannedActions(settings, result.averageScore),
  };
}

async function maybeCreateAutoDeal(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  averageScore: number;
  settings: SalesAgentSettings;
  conversationId?: string | null;
  channel?: MessagingChannel | null;
  contactName?: string | null;
}): Promise<boolean> {
  if (
    !input.settings.autoDealEnabled ||
    input.averageScore < input.settings.autoDealThreshold
  ) {
    return false;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentDeals } = await input.admin
    .from("crm_deals")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("contact_id", input.contactId)
    .eq("status", "open")
    .ilike("title", `%${AUTO_DEAL_TITLE}%`)
    .gte("created_at", since)
    .limit(1);

  if (recentDeals?.length) {
    return false;
  }

  const { data: contact } = await input.admin
    .from("contacts")
    .select("deal_value, name")
    .eq("id", input.contactId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const dealValue =
    typeof contact?.deal_value === "number" ? contact.deal_value : 0;

  const { error } = await input.admin.from("crm_deals").insert({
    business_id: input.businessId,
    contact_id: input.contactId,
    title: AUTO_DEAL_TITLE,
    value: dealValue,
    stage: "qualified",
    status: "open",
    is_primary: false,
  });

  if (error) {
    console.warn(
      "[sales-agent] auto-deal insert failed",
      JSON.stringify({ error: error.message }),
    );
    return false;
  }

  if (input.conversationId && input.channel) {
    await createAiActionNotification({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
      channel: input.channel,
      contactId: input.contactId,
      contactName: input.contactName ?? contact?.name ?? null,
      agentName: "Sales agent",
      actionsApplied: [
        `Created deal "${AUTO_DEAL_TITLE}" (score ${input.averageScore})`,
      ],
    });
  }

  return true;
}

export async function processSalesAgentRules(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  message: string;
  conversationId?: string | null;
  channel?: MessagingChannel | null;
}): Promise<void> {
  const settings = await getSalesAgentSettings(input.businessId);

  if (!settings.salesAgentEnabled) {
    return;
  }

  const result = await evaluateBant(input.businessId, input.message);

  if (!result.success) {
    return;
  }

  const { evaluation, averageScore } = result;

  const updates: {
    lead_score: number;
    ai_summary: string;
    pipeline_stage?: string;
  } = {
    lead_score: averageScore,
    ai_summary: evaluation.summary || evaluation.suggestedAction,
  };

  if (
    settings.autoQualifyPipeline &&
    averageScore >= settings.bantThreshold
  ) {
    updates.pipeline_stage = "qualified";
  }

  await input.admin
    .from("contacts")
    .update(updates)
    .eq("id", input.contactId)
    .eq("business_id", input.businessId);

  await maybeCreateAutoDeal({
    admin: input.admin,
    businessId: input.businessId,
    contactId: input.contactId,
    averageScore,
    settings,
    conversationId: input.conversationId,
    channel: input.channel,
  });

  // High-intent CRM task (uses updated lead_score + keyword signal).
  const { processHighIntentTaskRule } = await import(
    "@/services/high-intent-task.service"
  );
  await processHighIntentTaskRule({
    admin: input.admin,
    businessId: input.businessId,
    contactId: input.contactId,
    message: input.message,
  });
}
