"use server";

import { z } from "zod";

import { createCheckoutSession } from "@/services/stripe.service";

const schema = z.object({
  planId: z.string().trim().min(1, "Plan is required."),
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
