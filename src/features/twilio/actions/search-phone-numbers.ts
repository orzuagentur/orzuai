"use server";

import { z } from "zod";

import { searchAvailableTwilioNumbersForCurrentUser } from "@/services/twilio-integration.service";

const schema = z.object({
  countryCode: z.string().trim().min(2).max(2),
  areaCode: z.string().trim().max(8).optional(),
});

export async function searchTwilioPhoneNumbersAction(input: {
  countryCode: string;
  areaCode?: string;
}) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      numbers: [],
      message: parsed.error.issues[0]?.message ?? "Invalid search.",
    };
  }

  return searchAvailableTwilioNumbersForCurrentUser(parsed.data);
}
