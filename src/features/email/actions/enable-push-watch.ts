"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { EMAIL_MESSAGES } from "@/features/email/constants";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { renewGmailWatchForBusiness } from "@/services/gmail-integration.service";

export async function enableGmailPushWatchAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return {
        success: false,
        message: EMAIL_MESSAGES.noBusinessDescription,
      };
    }

    const result = await renewGmailWatchForBusiness(business.id);

    revalidatePath(DASHBOARD_ROUTES.integrations);
    revalidatePath(`${DASHBOARD_ROUTES.integrations}/email`);

    return result;
  } catch {
    return {
      success: false,
      message: EMAIL_MESSAGES.pushFailed,
    };
  }
}
