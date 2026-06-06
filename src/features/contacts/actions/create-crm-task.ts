"use server";

import { createCrmTask } from "@/services/crm-tasks.service";
import type {
  CrmTaskActionResult,
  CreateCrmTaskInput,
} from "@/types/crm-task.types";

export async function createCrmTaskAction(
  input: CreateCrmTaskInput,
): Promise<CrmTaskActionResult> {
  return createCrmTask(input);
}
