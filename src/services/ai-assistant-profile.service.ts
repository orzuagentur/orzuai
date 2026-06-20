import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { DEFAULT_COMMUNICATION_STYLE } from "@/features/ai-assistant/communication-styles";
import { getDefaultGeminiModel } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  AiAssistantProfileData,
  SaveAiAssistantProfileInput,
} from "@/types/ai-assistant-profile.types";
import { saveAiAssistantProfileSchema } from "@/types/ai-assistant-profile.types";

function revalidateAssistantProfilePaths(): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

function mapProfileRow(row: {
  business_id: string;
  name: string;
  system_prompt: string;
  communication_style: string;
  language: string;
}): AiAssistantProfileData {
  return {
    businessId: row.business_id,
    name: row.name,
    systemPrompt: row.system_prompt,
    communicationStyle: row.communication_style,
    language: row.language,
  };
}

export function getDefaultAiAssistantProfile(
  businessId: string,
): AiAssistantProfileData {
  return {
    businessId,
    name: "AI Assistant",
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
    communicationStyle: DEFAULT_COMMUNICATION_STYLE,
    language: DEFAULT_AI_LANGUAGE,
  };
}

export async function ensureAiAssistantProfile(
  businessId: string,
): Promise<AiAssistantProfileData> {
  if (!hasSupabaseEnv()) {
    return getDefaultAiAssistantProfile(businessId);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_assistant_profile")
    .select("business_id, name, system_prompt, communication_style, language")
    .eq("business_id", businessId)
    .maybeSingle();

  if (data) {
    return mapProfileRow(data);
  }

  const defaults = getDefaultAiAssistantProfile(businessId);
  const { data: created } = await supabase
    .from("ai_assistant_profile")
    .insert({
      business_id: businessId,
      name: defaults.name,
      system_prompt: defaults.systemPrompt,
      communication_style: defaults.communicationStyle,
      language: defaults.language,
    })
    .select("business_id, name, system_prompt, communication_style, language")
    .single();

  return created ? mapProfileRow(created) : defaults;
}

export async function getAiAssistantProfileForBusiness(
  businessId: string,
): Promise<AiAssistantProfileData> {
  return ensureAiAssistantProfile(businessId);
}

export async function saveAiAssistantProfile(
  input: SaveAiAssistantProfileInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveAiAssistantProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid profile.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ai_assistant_profile").upsert(
    {
      business_id: business.id,
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      communication_style: parsed.data.communicationStyle,
      language: parsed.data.language,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return { success: false, message: "Unable to save assistant profile." };
  }

  const defaultModel = getDefaultGeminiModel();

  await supabase
    .from("ai_settings")
    .update({
      provider: "gemini",
      model: defaultModel,
      language: parsed.data.language,
      system_prompt: parsed.data.systemPrompt,
    })
    .eq("business_id", business.id);

  revalidateAssistantProfilePaths();
  return { success: true };
}
