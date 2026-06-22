"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { EMAIL_MESSAGES } from "@/features/email/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { syncGmailInboxForBusiness } from "@/services/gmail-integration.service";

export async function syncGmailNowAction(): Promise<{
  success: boolean;
  imported: number;
  message?: string;
}> {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return {
        success: false,
        imported: 0,
        message: EMAIL_MESSAGES.noBusinessDescription,
      };
    }

    const admin = createAdminClient();
    const result = await syncGmailInboxForBusiness(admin, business.id, {
      initial: true,
    });

    revalidatePath(DASHBOARD_ROUTES.chats);
    revalidatePath(`${DASHBOARD_ROUTES.chats}/email`);
    revalidatePath(DASHBOARD_ROUTES.integrations);

    return {
      success: true,
      imported: result.imported,
      message: EMAIL_MESSAGES.syncSuccess(result.imported),
    };
  } catch {
    return {
      success: false,
      imported: 0,
      message: EMAIL_MESSAGES.syncFailed,
    };
  }
}
