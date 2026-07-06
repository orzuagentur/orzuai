"use server";

import { createPaymentMethodSetupSession } from "@/services/stripe.service";

export async function updatePaymentMethodAction() {
  return createPaymentMethodSetupSession();
}
