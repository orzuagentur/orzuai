"use server";

import { z } from "zod";

import { connectTwilioWithAuthTokenForCurrentUser } from "@/services/twilio-integration.service";

const connectTwilioAuthTokenSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[a-fA-F0-9]{32}$/, "Invalid Account SID."),
  authToken: z.string().trim().min(16, "Twilio Auth Token is too short."),
});

export async function connectTwilioAuthTokenAction(input: {
  accountSid: string;
  authToken: string;
}): Promise<{ success: boolean; message?: string }> {
  const parsed = connectTwilioAuthTokenSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid Twilio credentials.",
    };
  }

  return connectTwilioWithAuthTokenForCurrentUser(parsed.data);
}
