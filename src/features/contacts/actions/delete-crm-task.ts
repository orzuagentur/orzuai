"use server";

import { deleteCrmTask } from "@/services/crm-tasks.service";
import type {
  CrmTaskActionResult,
  DeleteCrmTaskInput,
} from "@/types/crm-task.types";

export async function deleteCrmTaskAction(
  input: DeleteCrmTaskInput,
): Promise<CrmTaskActionResult> {
  return deleteCrmTask(input);
}
