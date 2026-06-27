import "server-only";

import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { getDefaultGeminiModel } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagingChannel } from "@/types/database.types";

export type VoiceAiBusinessContext = {
  businessName: string;
  provider: string;
  model: string;
  language: string;
  systemPrompt: string;
};

export class BusinessContextRepository {
  async findBusinessName(businessId: string): Promise<string | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("businesses")
      .select("business_name")
      .eq("id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.business_name ?? null;
  }

  async findPrimaryAiSettings(
    businessId: string,
    channels: MessagingChannel[] = ["website_forms", "whatsapp", "telegram"],
  ): Promise<{
    provider: string;
    model: string;
    language: string;
    systemPrompt: string;
  } | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_settings")
      .select("provider, model, language, system_prompt, channel")
      .eq("business_id", businessId)
      .in("channel", channels)
      .order("channel", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      provider: data.provider,
      model: data.model,
      language: data.language,
      systemPrompt: data.system_prompt,
    };
  }
}

export function getBusinessContextRepository(): BusinessContextRepository {
  return new BusinessContextRepository();
}

export async function getVoiceAiBusinessContext(
  businessId: string,
): Promise<VoiceAiBusinessContext> {
  const repo = getBusinessContextRepository();
  const [businessName, aiSettings] = await Promise.all([
    repo.findBusinessName(businessId),
    repo.findPrimaryAiSettings(businessId),
  ]);

  return {
    businessName: businessName ?? "the business",
    provider: aiSettings?.provider ?? "gemini",
    model: aiSettings?.model ?? getDefaultGeminiModel(),
    language: aiSettings?.language ?? DEFAULT_AI_LANGUAGE,
    systemPrompt: aiSettings?.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT,
  };
}
