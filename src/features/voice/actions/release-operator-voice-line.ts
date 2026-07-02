"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { releaseOperatorVoiceLine } from "@/services/voice-outbound-cancel.service";

export async function releaseOperatorVoiceLineAction(input?: {
  phoneNumber?: string;
}): Promise<{ success: boolean; message?: string; released: number }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found.", released: 0 };
  }

  return releaseOperatorVoiceLine({
    businessId: business.id,
    phoneNumber: input?.phoneNumber?.trim() || undefined,
  });
}
