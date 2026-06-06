"use server";

import { createBillingPortalSession } from "@/services/stripe.service";

export async function createBillingPortalAction(): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  return createBillingPortalSession();
}
