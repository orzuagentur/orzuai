"use server";

import { createTwilioTopUpSession } from "@/services/stripe.service";

export async function createTwilioTopUpAction(input: { amountCents: number }) {
  return createTwilioTopUpSession(input.amountCents);
}
