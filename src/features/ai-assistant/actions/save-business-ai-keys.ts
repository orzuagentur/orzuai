"use server";

import { z } from "zod";

import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  clearBusinessAiProviderKey,
  saveBusinessAiProviderKey,
  setPreferCustomerAiKeys,
} from "@/services/business-ai-keys.service";

const saveByokSettingsSchema = z.object({
  preferCustomerAiKeys: z.boolean(),
  geminiApiKey: z.string().max(500).optional(),
  openaiApiKey: z.string().max(500).optional(),
  clearGemini: z.boolean().optional(),
  clearOpenAi: z.boolean().optional(),
});

export async function saveBusinessAiKeySettingsAction(
  input: z.infer<typeof saveByokSettingsSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveByokSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const preferResult = await setPreferCustomerAiKeys(
    business.id,
    parsed.data.preferCustomerAiKeys,
  );

  if (!preferResult.success) {
    return preferResult;
  }

  if (parsed.data.clearGemini) {
    const cleared = await clearBusinessAiProviderKey(
      business.id,
      "gemini",
      user.id,
    );
    if (!cleared.success) {
      return cleared;
    }
  } else if (parsed.data.geminiApiKey?.trim()) {
    const saved = await saveBusinessAiProviderKey(
      business.id,
      "gemini",
      parsed.data.geminiApiKey,
      user.id,
    );
    if (!saved.success) {
      return saved;
    }
  }

  if (parsed.data.clearOpenAi) {
    const cleared = await clearBusinessAiProviderKey(
      business.id,
      "openai",
      user.id,
    );
    if (!cleared.success) {
      return cleared;
    }
  } else if (parsed.data.openaiApiKey?.trim()) {
    const saved = await saveBusinessAiProviderKey(
      business.id,
      "openai",
      parsed.data.openaiApiKey,
      user.id,
    );
    if (!saved.success) {
      return saved;
    }
  }

  return { success: true };
}
