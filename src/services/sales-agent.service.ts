import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/services/llm.service";
import type { SalesAgentSettings } from "@/types/ai-usage.types";

type MessagingDbClient = ReturnType<typeof createAdminClient>;

const BANT_PROMPT = `Analyze this customer message for BANT sales qualification.
Return ONLY valid JSON with keys: budget (0-100), authority (0-100), need (0-100), timeline (0-100), summary (string), suggestedAction (string).
Message:`;

export async function getSalesAgentSettings(
  businessId: string,
): Promise<SalesAgentSettings> {
  const defaults: SalesAgentSettings = {
    salesAgentEnabled: false,
    bantThreshold: 70,
    autoQualifyPipeline: true,
  };

  if (!hasSupabaseEnv()) {
    return defaults;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_ai_config")
    .select("sales_agent_enabled, bant_threshold, auto_qualify_pipeline")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return defaults;
  }

  return {
    salesAgentEnabled: data.sales_agent_enabled,
    bantThreshold: data.bant_threshold,
    autoQualifyPipeline: data.auto_qualify_pipeline,
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

export async function processSalesAgentRules(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  message: string;
}): Promise<void> {
  const settings = await getSalesAgentSettings(input.businessId);

  if (!settings.salesAgentEnabled) {
    return;
  }

  const aiResult = await generateText({
    businessId: input.businessId,
    prompt: `${BANT_PROMPT}\n${input.message}`,
    systemInstruction:
      "You are a B2B sales analyst. Score BANT dimensions from 0 to 100.",
  });

  if (!aiResult.success) {
    return;
  }

  const evaluation = parseBantResponse(aiResult.data.text);

  if (!evaluation) {
    return;
  }

  const averageScore = Math.round(
    (evaluation.budget +
      evaluation.authority +
      evaluation.need +
      evaluation.timeline) /
      4,
  );

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
}
