"use server";

import { updateCrmTaskStatus } from "@/services/crm-tasks.service";
import type {
  CrmTaskActionResult,
  UpdateCrmTaskStatusInput,
} from "@/types/crm-task.types";

export async function updateCrmTaskStatusAction(
  input: UpdateCrmTaskStatusInput,
): Promise<CrmTaskActionResult> {
  return updateCrmTaskStatus(input);
}
