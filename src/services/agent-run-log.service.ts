import "server-only";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

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
