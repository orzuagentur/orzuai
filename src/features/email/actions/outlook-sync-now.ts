"use server";

import { OUTLOOK_MESSAGES } from "@/features/email/outlook-constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { syncOutlookInboxForBusiness } from "@/services/outlook-integration.service";

export async function syncOutlookNowAction(): Promise<{
  success: boolean;
  message: string;
}> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: OUTLOOK_MESSAGES.syncFailed };
  }

  const result = await syncOutlookInboxForBusiness(
    createAdminClient(),
    business.id,
  );

  if (result.error && result.scanned === 0 && result.imported === 0) {
    return { success: false, message: result.error };
  }

  return {
    success: true,
    message: OUTLOOK_MESSAGES.syncSuccess(result.imported, result.scanned),
  };
}
