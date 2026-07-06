"use server";

import { changeSubscriptionPlan } from "@/services/stripe.service";

export async function changeSubscriptionPlanAction(input: { planId: string }) {
  return changeSubscriptionPlan(input.planId);
}
