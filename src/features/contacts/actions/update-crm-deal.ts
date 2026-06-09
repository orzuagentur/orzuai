"use server";

import { updateCrmDeal } from "@/services/crm-deals.service";
import type {
  CrmDealActionResult,
  UpdateCrmDealInput,
} from "@/types/crm-deal.types";

export async function updateCrmDealAction(
  input: UpdateCrmDealInput,
): Promise<CrmDealActionResult> {
  return updateCrmDeal(input);
}
