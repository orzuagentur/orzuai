"use server";

import { disconnectTwilioForCurrentUser } from "@/services/twilio-integration.service";

export async function disconnectTwilioAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  return disconnectTwilioForCurrentUser();
}
