"use server";

import { quoteTwilioTopUp } from "@/services/twilio-wallet.service";

export async function quoteTwilioTopUpAction(input: { creditCents: number }) {
  if (input.creditCents < 500) {
    return {
      success: false as const,
      message: "Minimum top-up is $5.",
    };
  }

  return {
    success: true as const,
    quote: quoteTwilioTopUp(input.creditCents),
  };
}
