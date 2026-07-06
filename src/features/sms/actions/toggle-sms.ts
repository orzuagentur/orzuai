"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { setSmsEnabled } from "@/services/voice-agent.service";

export async function toggleSmsAction(
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return setSmsEnabled(business.id, enabled);
}
