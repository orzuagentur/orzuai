import "server-only";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

import type { FilteredExecutorPlan } from "@/lib/ai/tools/types";
import {
  buildPlannedActionsFromPlan,
  formatBlockedAction,
  formatMetaIntent,
} from "@/lib/ai/agent-run-actions";
import type { ExecutorPlan } from "@/types/agent-executor.types";

export async function logOrchestratorAgentRun(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    conversationId: string | null;
    contactId: string | null;
    channel: string;
    clientMessage: string;
    routingMethod?: string | null;
    actions?: string[];
    success: boolean;
    errorMessage?: string | null;
  },
): Promise<void> {
  await admin.from("agent_runs").insert({
    business_id: input.businessId,
    conversation_id: input.conversationId,
    contact_id: input.contactId,
    channel: input.channel,
    client_message: input.clientMessage.slice(0, 2000),
    routing_method: input.routingMethod ?? null,
    actions: input.actions ?? [],
    success: input.success,
    error_message: input.errorMessage ?? null,
  });
}

export function buildAgentOpsActions(input: {
  intent?: string | null;
  rawPlan: ExecutorPlan;
  filtered?: FilteredExecutorPlan;
  executed?: string[];
  skipped?: string[];
}): string[] {
  const actions: string[] = [];

  if (input.intent) {
    actions.push(formatMetaIntent(input.intent));
  }

  actions.push(...buildPlannedActionsFromPlan(input.rawPlan));

  if (input.filtered) {
    for (const blocked of input.filtered.blockedActions) {
      actions.push(formatBlockedAction("permission", blocked));
    }

    if (input.filtered.contactUpdatesBlocked) {
      actions.push(formatBlockedAction("permission", "contact_updates"));
    }
  }

  if (input.skipped?.length) {
    actions.push(...input.skipped);
  }

  if (input.executed?.length) {
    for (const entry of input.executed) {
      if (entry.startsWith("Booking not confirmed:")) {
        actions.push(`failed:booking:${entry.replace(/^Booking not confirmed:\s*/, "")}`);
      } else {
        actions.push(`executed:${entry}`);
      }
    }
  }

  return actions;
}

export async function logAgentOpsRun(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    conversationId: string | null;
    contactId: string | null;
    channel: string;
    clientMessage: string;
    routingMethod?: string | null;
    actions: string[];
    success: boolean;
    errorMessage?: string | null;
  },
): Promise<void> {
  await logOrchestratorAgentRun(admin, input);
}
