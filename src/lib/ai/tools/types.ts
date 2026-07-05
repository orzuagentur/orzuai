import type { z } from "zod";

import type { ExecutorAction, ExecutorPlan } from "@/types/agent-executor.types";

export type AgentToolProfile = {
  canUpdateContact: boolean;
  canCreateTask: boolean;
  canCreateDeal: boolean;
  canAddNote: boolean;
  canAddInternalNote: boolean;
  canCreateCalendarEvent: boolean;
};

export type ToolPermissionKey = keyof AgentToolProfile;

export type AgentToolName = ExecutorAction["type"];

export type AgentToolDefinition = {
  name: AgentToolName;
  permission: ToolPermissionKey;
  customerVisible: boolean;
  runsWithoutContact: boolean;
  description: string;
  orchestratorHint: string;
  executorHint: string;
  schema: z.ZodTypeAny;
};

export type AgentToolAuditEntry = {
  tool: AgentToolName | "contact_updates" | "executor_plan";
  businessId: string;
  conversationId?: string | null;
  contactId?: string | null;
  success: boolean;
  label?: string | null;
  errorMessage?: string | null;
};

export type FilteredExecutorPlan = {
  plan: ExecutorPlan;
  blockedActions: AgentToolName[];
  contactUpdatesBlocked: boolean;
};
