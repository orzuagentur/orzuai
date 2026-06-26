"use server";

import { refreshTwilioForCurrentUser } from "@/services/twilio-integration.service";

export async function refreshTwilioPhoneNumbersAction() {
  return refreshTwilioForCurrentUser();
}
