"use server";

import { OUTLOOK_MESSAGES } from "@/features/email/outlook-constants";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { disconnectOutlook } from "@/services/outlook-integration.service";

export async function disconnectOutlookAction(): Promise<{
  success: boolean;
  message: string;
}> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: OUTLOOK_MESSAGES.oauthError };
  }

  const result = await disconnectOutlook(business.id);
  return {
    success: result.success,
    message: result.success
      ? OUTLOOK_MESSAGES.disconnectSuccess
      : OUTLOOK_MESSAGES.oauthError,
  };
}
