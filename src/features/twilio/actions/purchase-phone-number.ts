"use server";

import { z } from "zod";

import { purchaseTwilioNumberForCurrentUser } from "@/services/twilio-integration.service";

const schema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Invalid phone number."),
});

export async function purchaseTwilioPhoneNumberAction(input: {
  phoneNumber: string;
}) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid phone number.",
    };
  }

  return purchaseTwilioNumberForCurrentUser(parsed.data.phoneNumber);
}
