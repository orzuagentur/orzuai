import { z } from "zod";

import { AUTOMATION_ACTIONS, AUTOMATION_TRIGGERS } from "@/features/automations/constants";

export const automationTriggerTypes = AUTOMATION_TRIGGERS.map((t) => t.id);
export const automationActionTypes = AUTOMATION_ACTIONS.map((a) => a.id);

export const saveAutomationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  triggerType: z.enum(automationTriggerTypes as [string, ...string[]]),
  actionType: z.enum(automationActionTypes as [string, ...string[]]),
  enabled: z.boolean().optional().default(true),
});

export type SaveAutomationInput = z.infer<typeof saveAutomationSchema>;

export type AutomationItem = {
  id: string;
  name: string;
  triggerType: string;
  actionType: string;
  enabled: boolean;
  createdAt: string;
};
