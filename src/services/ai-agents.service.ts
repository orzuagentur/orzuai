import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  type RoutableAgentRef,
  validateAgentChannelRouting,
} from "@/features/ai-assistant/agent-channel-routing";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getDefaultGeminiModel, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { resolveAgentIconId } from "@/features/ai-assistant/agent-icons";
import type {
  AiAgentActionResult,
  AiAgentItem,
  CreateAiAgentInput,
  DeleteAiAgentInput,
  UpdateAiAgentInput,
} from "@/types/ai-agent.types";
import {
  createAiAgentSchema,
  deleteAiAgentSchema,
  updateAiAgentSchema,
} from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function revalidateAgentPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

function mapAiAgent(row: {
  id: string;
  name: string;
  system_prompt: string;
  channels: MessagingChannel[] | null;
  trigger_keywords: string[] | null;
  enabled: boolean;
  provider?: string | null;
  model?: string | null;
  language?: string | null;
  communication_style?: string | null;
  icon?: string | null;
  use_custom_model?: boolean | null;
  created_at: string;
  updated_at: string;
}): AiAgentItem {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    channels: row.channels ?? [],
    triggerKeywords: row.trigger_keywords ?? [],
    enabled: row.enabled,
    provider: row.provider ?? "gemini",
    model: row.model ?? getDefaultGeminiModel(),
    language: row.language ?? "English",
    communicationStyle: row.communication_style ?? "professional",
    icon: resolveAgentIconId(row.icon),
    useCustomModel: row.use_custom_model ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAiAgents(): Promise<AiAgentItem[]> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_agents")
    .select(
      "id, name, system_prompt, channels, trigger_keywords, enabled, provider, model, language, communication_style, icon, use_custom_model, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map(mapAiAgent);
}

async function loadRoutableAgentsForBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
): Promise<RoutableAgentRef[]> {
  const { data } = await supabase
    .from("ai_agents")
    .select("id, name, channels, trigger_keywords")
    .eq("business_id", businessId);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    channels: row.channels ?? [],
    triggerKeywords: row.trigger_keywords ?? [],
  }));
}

export async function createAiAgent(
  input: CreateAiAgentInput,
): Promise<AiAgentActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  const parsed = createAiAgentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? AI_ASSISTANT_MESSAGES.saveFailed,
      },
    };
  }

  const supabase = await createClient();
  const existingAgents = await loadRoutableAgentsForBusiness(supabase, businessId);
  const routing = validateAgentChannelRouting(existingAgents, {
    channels: parsed.data.channels,
    triggerKeywords: parsed.data.triggerKeywords,
  });

  if (!routing.valid) {
    return {
      success: false,
      error: {
        code: "ROUTING_CONFLICT",
        message: routing.message,
      },
    };
  }

  const { data: created, error } = await supabase
    .from("ai_agents")
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      channels: parsed.data.channels,
      trigger_keywords: parsed.data.triggerKeywords,
      enabled: parsed.data.enabled,
      provider: parsed.data.provider,
      model: parsed.data.model ?? getDefaultGeminiModel(),
      language: parsed.data.language ?? "English",
      communication_style: parsed.data.communicationStyle,
      icon: parsed.data.icon,
      use_custom_model: parsed.data.useCustomModel,
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: { code: "CREATE_FAILED", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  revalidateAgentPaths();
  return { success: true, id: created.id };
}

export async function toggleAiAgentEnabled(input: {
  id: string;
  enabled: boolean;
}): Promise<AiAgentActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_agents")
    .update({ enabled: input.enabled })
    .eq("id", input.id)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  revalidateAgentPaths();
  return { success: true };
}

export async function updateAiAgent(
  input: UpdateAiAgentInput,
): Promise<AiAgentActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  const parsed = updateAiAgentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? AI_ASSISTANT_MESSAGES.saveFailed,
      },
    };
  }

  const supabase = await createClient();
  const existingAgents = await loadRoutableAgentsForBusiness(supabase, businessId);
  const routing = validateAgentChannelRouting(existingAgents, {
    id: parsed.data.id,
    channels: parsed.data.channels,
    triggerKeywords: parsed.data.triggerKeywords,
  });

  if (!routing.valid) {
    return {
      success: false,
      error: {
        code: "ROUTING_CONFLICT",
        message: routing.message,
      },
    };
  }

  const { error } = await supabase
    .from("ai_agents")
    .update({
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      channels: parsed.data.channels,
      trigger_keywords: parsed.data.triggerKeywords,
      enabled: parsed.data.enabled,
      provider: parsed.data.provider,
      model: parsed.data.model,
      language: parsed.data.language,
      communication_style: parsed.data.communicationStyle,
      icon: parsed.data.icon,
      use_custom_model: parsed.data.useCustomModel,
    })
    .eq("id", parsed.data.id)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: AI_ASSISTANT_MESSAGES.saveFailed },
    };
  }

  revalidateAgentPaths();
  return { success: true };
}

export async function deleteAiAgent(
  input: DeleteAiAgentInput,
): Promise<AiAgentActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: AI_ASSISTANT_MESSAGES.deleteFailed },
    };
  }

  const parsed = deleteAiAgentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? AI_ASSISTANT_MESSAGES.deleteFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_agents")
    .delete()
    .eq("id", parsed.data.id)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: AI_ASSISTANT_MESSAGES.deleteFailed },
    };
  }

  revalidateAgentPaths();
  return { success: true };
}
