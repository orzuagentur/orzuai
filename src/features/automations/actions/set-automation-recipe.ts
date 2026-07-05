"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { AutomationRecipeId } from "@/features/automations/rule-catalog";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { saveFollowUpAgentSettings } from "@/services/follow-up-settings.service";

export async function setAutomationRecipeAction(
  recipeId: AutomationRecipeId,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: AUTOMATIONS_MESSAGES.noBusiness };
  }

  if (recipeId === "never_miss_lead") {
    const result = await saveFollowUpAgentSettings(business.id, { enabled });

    if (!result.success) {
      return {
        success: false,
        message: result.message ?? AUTOMATIONS_MESSAGES.saveFailed,
      };
    }
  }

  revalidatePath(DASHBOARD_ROUTES.automations);
  return { success: true };
}

export async function enableRecommendedStackAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  return setAutomationRecipeAction("never_miss_lead", true);
}
