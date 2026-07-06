"use server";

import { syncSubscriptionForCurrentBusiness } from "@/services/stripe.service";

export async function syncSubscriptionAction() {
  return syncSubscriptionForCurrentBusiness();
}
