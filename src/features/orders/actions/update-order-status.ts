"use server";

import { updateCrmOrderStatus } from "@/services/crm-orders.service";
import type {
  CrmOrderActionResult,
  UpdateCrmOrderStatusInput,
} from "@/types/crm-order.types";

export async function updateCrmOrderStatusAction(
  input: UpdateCrmOrderStatusInput,
): Promise<CrmOrderActionResult> {
  return updateCrmOrderStatus(input);
}
