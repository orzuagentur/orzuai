"use server";

import { z } from "zod";

import { AI_PROVIDERS } from "@/lib/ai/constants";
import {
  deleteBusinessProviderApiKey,
  saveBusinessProviderApiKey,
  setBusinessPreferCustomerAiKeys,
} from "@/services/business-ai-credentials.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const saveKeySchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().min(8).max(500),
  keyName: z.string().trim().min(1).max(80),
  useForAllAgents: z.boolean().optional(),
});

const removeKeySchema = z.object({
  provider: z.enum(AI_PROVIDERS),
});

const preferKeysSchema = z.object({
  preferCustomerAiKeys: z.boolean(),
});

export async function saveBusinessAiProviderKeyAction(
  input: z.infer<typeof saveKeySchema>,
) {
  const parsed = saveKeySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid API key.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false as const, message: "Business not found." };
  }

  return saveBusinessProviderApiKey(
    business.id,
    parsed.data.provider,
    parsed.data.apiKey,
    {
      keyName: parsed.data.keyName,
      useForAllAgents: parsed.data.useForAllAgents,
      actorUserId: user.id,
      actorEmail: user.email,
    },
  );
}

export async function removeBusinessAiProviderKeyAction(
  input: z.infer<typeof removeKeySchema>,
) {
  const parsed = removeKeySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid provider.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false as const, message: "Business not found." };
  }

  return deleteBusinessProviderApiKey(
    business.id,
    parsed.data.provider,
    {
      actorUserId: user.id,
      actorEmail: user.email,
    },
  );
}

export async function setPreferCustomerAiKeysAction(
  input: z.infer<typeof preferKeysSchema>,
) {
  const parsed = preferKeysSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid preference.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false as const, message: "Business not found." };
  }

  return setBusinessPreferCustomerAiKeys(
    business.id,
    parsed.data.preferCustomerAiKeys,
  );
}
