"use server";

import { disconnectGmail } from "@/services/gmail-integration.service";
import { EMAIL_MESSAGES } from "@/features/email/constants";

export async function disconnectGmailAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  const result = await disconnectGmail();

  if (result.success) {
    return { success: true, message: EMAIL_MESSAGES.disconnectSuccess };
  }

  return result;
}
