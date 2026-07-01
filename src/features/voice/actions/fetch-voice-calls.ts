"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { getVoiceInboxCalls } from "@/services/voice-inbox.service";

export async function fetchVoiceCallsAction(): Promise<
  | { success: true; data: Awaited<ReturnType<typeof getVoiceInboxCalls>> }
  | { success: false; message: string }
> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return {
    success: true,
    data: await getVoiceInboxCalls(business.id),
  };
}
