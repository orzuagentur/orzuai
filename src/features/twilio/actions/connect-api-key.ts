"use server";

import { z } from "zod";

import { connectTwilioWithApiKeyForCurrentUser } from "@/services/twilio-integration.service";

const connectTwilioApiKeySchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[a-fA-F0-9]{32}$/, "Invalid Account SID."),
  apiKeySid: z
    .string()
    .trim()
    .regex(/^SK[a-fA-F0-9]{32}$/, "Invalid API Key SID."),
  apiKeySecret: z.string().trim().min(16, "API Key Secret is too short."),
  authToken: z.string().trim().min(16, "Twilio Auth Token is too short."),
});

export async function connectTwilioApiKeyAction(input: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
}): Promise<{ success: boolean; message?: string }> {
  const parsed = connectTwilioApiKeySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid Twilio credentials.",
    };
  }

  return connectTwilioWithApiKeyForCurrentUser(parsed.data);
}
