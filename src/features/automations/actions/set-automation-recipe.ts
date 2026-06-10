"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { AutomationRecipeId } from "@/features/automations/rule-catalog";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { saveFollowUpAgentSettings } from "@/services/follow-up-settings.service";
import {
  getSalesAgentSettings,
  saveSalesAgentSettings,
} from "@/services/sales-agent.service";

export async function setAutomationRecipeAction(
  recipeId: AutomationRecipeId,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: AUTOMATIONS_MESSAGES.noBusiness };
  }

  const current = await getSalesAgentSettings(business.id);

  if (recipeId === "never_miss_lead") {
    const result = await saveFollowUpAgentSettings(business.id, { enabled });

    if (!result.success) {
      return {
        success: false,
        message: result.message ?? AUTOMATIONS_MESSAGES.saveFailed,
      };
    }
  }

  if (recipeId === "auto_qualify_buyers") {
    const salesResult = await saveSalesAgentSettings(business.id, {
      ...current,
      salesAgentEnabled: enabled,
      ...(enabled
        ? {
            bantThreshold: 70,
            autoQualifyPipeline: true,
            sentimentAnalysisEnabled: true,
          }
        : { autoQualifyPipeline: false }),
    });

    if (!salesResult.success) {
      return {
        success: false,
        message: salesResult.message ?? AUTOMATIONS_MESSAGES.saveFailed,
      };
    }
  }

  if (recipeId === "hot_lead_task") {
    const latest = await getSalesAgentSettings(business.id);
    const salesResult = await saveSalesAgentSettings(business.id, {
      ...latest,
      ...(enabled ? { salesAgentEnabled: true } : {}),
      autoTaskEnabled: enabled,
      ...(enabled ? { autoTaskThreshold: 75 } : {}),
    });

    if (!salesResult.success) {
      return {
        success: false,
        message: salesResult.message ?? AUTOMATIONS_MESSAGES.saveFailed,
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
  const recipes: AutomationRecipeId[] = [
    "never_miss_lead",
    "auto_qualify_buyers",
    "hot_lead_task",
  ];

  for (const recipeId of recipes) {
    const result = await setAutomationRecipeAction(recipeId, true);

    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}
