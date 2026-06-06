"use server";

import { saveFollowUpAgentSettings } from "@/services/follow-up-settings.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

export async function saveFollowUpAgentSettingsAction(enabled: boolean) {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return saveFollowUpAgentSettings(business.id, enabled);
}
