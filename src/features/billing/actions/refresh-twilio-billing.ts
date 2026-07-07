"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getTwilioBillingPageData } from "@/services/billing-twilio-page.service";

export async function refreshTwilioBillingAction() {
  const data = await getTwilioBillingPageData();

  revalidatePath(DASHBOARD_ROUTES.subscriptionTwilio);

  return {
    success: true as const,
    balanceCents: data.balanceCents,
    balanceCurrency: data.balanceCurrency,
    balanceError: data.balanceError,
    walletBalanceCents: data.walletBalanceCents,
    balanceUpdatedAt: data.balanceUpdatedAt,
  };
}
