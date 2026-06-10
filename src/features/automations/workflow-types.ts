import { z } from "zod";

import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
} from "@/features/automations/constants";

export const automationTriggerTypes = AUTOMATION_TRIGGERS.map((t) => t.id);
export const automationActionTypes = AUTOMATION_ACTIONS.map((a) => a.id);

export type AutomationTriggerType = (typeof automationTriggerTypes)[number];
export type AutomationActionType = (typeof automationActionTypes)[number];

export const PIPELINE_STAGES = [
  "new",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const automationConfigSchema = z.object({
  channels: z
    .array(z.enum(["whatsapp", "instagram", "telegram", "website_forms"]))
    .default([]),
  aiAgentId: z.string().uuid().nullable().optional(),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
  taskTitle: z.string().trim().max(200).optional(),
  tagName: z.string().trim().max(40).optional(),
  notifyTitle: z.string().trim().max(120).optional(),
});

export type AutomationConfig = z.infer<typeof automationConfigSchema>;

export const saveAutomationWorkflowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  triggerType: z.enum(automationTriggerTypes as [string, ...string[]]),
  actionType: z.enum(automationActionTypes as [string, ...string[]]),
  enabled: z.boolean().optional().default(true),
  config: automationConfigSchema.optional().default({ channels: [] }),
});

export type SaveAutomationWorkflowInput = z.infer<
  typeof saveAutomationWorkflowSchema
>;

export type AutomationWorkflowItem = {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  actionType: AutomationActionType;
  enabled: boolean;
  config: AutomationConfig;
  createdAt: string;
  updatedAt: string;
};

export function getTriggerLabel(triggerType: string): string {
  return (
    AUTOMATION_TRIGGERS.find((item) => item.id === triggerType)?.label ??
    triggerType
  );
}

export function getActionLabel(actionType: string): string {
  return (
    AUTOMATION_ACTIONS.find((item) => item.id === actionType)?.label ??
    actionType
  );
}

export function parseAutomationConfig(raw: unknown): AutomationConfig {
  const parsed = automationConfigSchema.safeParse(raw ?? {});

  if (parsed.success) {
    return parsed.data;
  }

  return { channels: [] };
}
