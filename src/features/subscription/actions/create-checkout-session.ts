"use server";

import { z } from "zod";

import { SUBSCRIPTION_PLAN_IDS } from "@/features/subscription/plans";
import { createCheckoutSession } from "@/services/stripe.service";

const schema = z.object({
  planId: z.enum(SUBSCRIPTION_PLAN_IDS),
});

export async function createCheckoutSessionAction(
  input: z.infer<typeof schema>,
): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid plan.",
    };
  }

  return createCheckoutSession(parsed.data.planId);
}
