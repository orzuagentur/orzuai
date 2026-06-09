"use server";

import { createCrmDeal } from "@/services/crm-deals.service";
import type {
  CreateCrmDealInput,
  CrmDealActionResult,
} from "@/types/crm-deal.types";

export async function createCrmDealAction(
  input: CreateCrmDealInput,
): Promise<CrmDealActionResult> {
  return createCrmDeal(input);
}
