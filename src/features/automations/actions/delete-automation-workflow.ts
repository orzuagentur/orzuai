"use server";

import { deleteCustomAutomation } from "@/services/custom-automations.service";

export async function deleteAutomationWorkflowAction(automationId: string) {
  return deleteCustomAutomation(automationId);
}
