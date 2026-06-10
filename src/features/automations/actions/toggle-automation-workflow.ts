"use server";

import { toggleCustomAutomation } from "@/services/custom-automations.service";

export async function toggleAutomationWorkflowAction(
  automationId: string,
  enabled: boolean,
) {
  return toggleCustomAutomation(automationId, enabled);
}
