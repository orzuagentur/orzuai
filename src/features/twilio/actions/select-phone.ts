"use server";

import { z } from "zod";

import { selectTwilioPhoneNumberForCurrentUser } from "@/services/twilio-integration.service";

const schema = z.object({
  phoneSid: z.string().trim().min(2).max(64),
});

export async function selectTwilioPhoneNumberAction(input: {
  phoneSid: string;
}): Promise<{ success: boolean; message?: string }> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid phone selection.",
    };
  }

  return selectTwilioPhoneNumberForCurrentUser(parsed.data.phoneSid);
}
