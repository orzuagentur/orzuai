"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { saveOrzuVoiceForwardTo } from "@/services/orzu-voice-numbers.service";

export async function saveVoiceForwardToAction(input: {
  forwardToE164: string;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business?.id) {
    return { success: false, message: "Business not found." };
  }

  const result = await saveOrzuVoiceForwardTo({
    businessId: business.id,
    forwardToE164: input.forwardToE164,
    markWizardComplete: true,
  });

  if (result.success) {
    revalidatePath(DASHBOARD_ROUTES.integrations);
    revalidatePath(`${DASHBOARD_ROUTES.integrations}/voice`);
  }

  return result;
}
