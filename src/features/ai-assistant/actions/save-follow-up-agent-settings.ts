"use server";

import { z } from "zod";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { saveFollowUpAgentSettings } from "@/services/follow-up-settings.service";

const saveFollowUpAgentSettingsSchema = z.object({
  enabled: z.boolean(),
  aiAgentId: z.string().uuid().nullable().optional(),
});

export async function saveFollowUpAgentSettingsAction(
  input: z.infer<typeof saveFollowUpAgentSettingsSchema>,
) {
  const parsed = saveFollowUpAgentSettingsSchema.safeParse(input);

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

  return saveFollowUpAgentSettings(business.id, parsed.data);
}
