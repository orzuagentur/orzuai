"use server";

import { z } from "zod";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { saveSalesAgentSettings } from "@/services/sales-agent.service";

const saveSalesAgentSettingsSchema = z.object({
  salesAgentEnabled: z.boolean(),
  bantThreshold: z.number().int().min(0).max(100),
  autoQualifyPipeline: z.boolean(),
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
