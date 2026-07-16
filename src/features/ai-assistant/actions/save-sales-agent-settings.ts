"use server";

import { z } from "zod";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  dryRunSalesAgentRules,
  saveSalesAgentSettings,
} from "@/services/sales-agent.service";
import type { SalesAgentRuleTestResult } from "@/types/ai-usage.types";

const saveSalesAgentSettingsSchema = z.object({
  salesAgentEnabled: z.boolean(),
  bantThreshold: z.number().int().min(0).max(100),
  autoQualifyPipeline: z.boolean(),
  autoTaskEnabled: z.boolean(),
  autoTaskThreshold: z.number().int().min(0).max(100),
  autoDealEnabled: z.boolean(),
  autoDealThreshold: z.number().int().min(0).max(100),
  sentimentAnalysisEnabled: z.boolean(),
});

const testSalesAgentRuleSchema = z.object({
  message: z.string().trim().min(1, "Enter a sample message.").max(2000),
});

export async function saveSalesAgentSettingsAction(
  input: z.infer<typeof saveSalesAgentSettingsSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveSalesAgentSettingsSchema.safeParse(input);

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

  return saveSalesAgentSettings(business.id, parsed.data);
}

export async function testSalesAgentRuleAction(
  input: z.infer<typeof testSalesAgentRuleSchema>,
): Promise<SalesAgentRuleTestResult> {
  const parsed = testSalesAgentRuleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid message.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return dryRunSalesAgentRules({
    businessId: business.id,
    message: parsed.data.message,
  });
}
