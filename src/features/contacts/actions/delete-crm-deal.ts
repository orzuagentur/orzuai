"use server";

import { deleteCrmDeal } from "@/services/crm-deals.service";
import type {
  CrmDealActionResult,
  DeleteCrmDealInput,
} from "@/types/crm-deal.types";

export async function deleteCrmDealAction(
  input: DeleteCrmDealInput,
): Promise<CrmDealActionResult> {
  return deleteCrmDeal(input);
}
