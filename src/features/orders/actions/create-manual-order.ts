"use server";

import { createManualCrmOrder } from "@/services/crm-orders.service";
import type {
  CreateManualCrmOrderInput,
  CrmOrderActionResult,
} from "@/types/crm-order.types";

export async function createManualCrmOrderAction(
  input: CreateManualCrmOrderInput,
): Promise<CrmOrderActionResult> {
  return createManualCrmOrder(input);
}
