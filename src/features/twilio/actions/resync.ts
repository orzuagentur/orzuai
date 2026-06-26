"use server";

import { resyncTwilioForCurrentUser } from "@/services/twilio-integration.service";

export async function resyncTwilioAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  return resyncTwilioForCurrentUser();
}
