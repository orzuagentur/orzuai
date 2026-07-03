"use server";

import { z } from "zod";

import { purchaseSubscriptionAddon } from "@/services/stripe.service";

const schema = z.object({
  addonId: z.string().trim().min(1, "Add-on is required."),
});

export async function purchaseSubscriptionAddonAction(
  input: z.infer<typeof schema>,
): Promise<{ success: true } | { success: false; message: string }> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid add-on.",
    };
  }

  return purchaseSubscriptionAddon(parsed.data.addonId);
}
