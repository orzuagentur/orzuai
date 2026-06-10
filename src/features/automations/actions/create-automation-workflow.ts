"use server";

import { createCustomAutomation } from "@/services/custom-automations.service";
import type { SaveAutomationWorkflowInput } from "@/features/automations/workflow-types";

export async function createAutomationWorkflowAction(
  input: SaveAutomationWorkflowInput,
) {
  return createCustomAutomation(input);
}
