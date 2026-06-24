import { z } from "zod";

import {
  executorActionSchema,
  executorContactUpdatesSchema,
  type ExecutorPlan,
} from "@/types/agent-executor.types";
import { CUSTOMER_INTENTS } from "@/types/intent-router.types";

export const orchestratorResponseSchema = z.object({
  intent: z.enum(CUSTOMER_INTENTS),
  confidence: z.number().min(0).max(1),
  /** @deprecated Use managerAlert / handoffConfirmed */
  needsHuman: z.boolean().optional(),
  managerAlert: z.boolean().default(false),
  handoffConfirmed: z.boolean().default(false),
  humanReason: z.string().trim().max(300).optional(),
  contactUpdates: executorContactUpdatesSchema.optional(),
  actions: z.array(executorActionSchema).max(5).default([]),
  clientSummary: z.string().trim().max(500).optional(),
});

export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;

export function orchestratorResponseToExecutorPlan(
  response: OrchestratorResponse,
): ExecutorPlan {
  return {
    contactUpdates: response.contactUpdates,
    actions: response.actions,
    clientSummary: response.clientSummary,
  };
}
