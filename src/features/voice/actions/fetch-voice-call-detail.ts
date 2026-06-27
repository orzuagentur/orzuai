"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { getVoiceCallDetail } from "@/services/voice-inbox.service";

export async function fetchVoiceCallDetailAction(
  callLogId: string,
): Promise<
  | { success: true; data: NonNullable<Awaited<ReturnType<typeof getVoiceCallDetail>>> }
  | { success: false; message: string }
> {
  const trimmedId = callLogId.trim();

  if (!trimmedId) {
    return { success: false, message: "Call not found." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const detail = await getVoiceCallDetail(business.id, trimmedId);

  if (!detail) {
    return { success: false, message: "Call not found." };
  }

  return { success: true, data: detail };
}
