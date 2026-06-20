import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { processInboundMessageAutomations } from "@/services/automation-engine.service";
import { processHighIntentTaskRule } from "@/services/high-intent-task.service";
import { processSalesAgentRules } from "@/services/sales-agent.service";
import { analyzeAndStoreSentiment } from "@/services/sentiment.service";
import type { Database, MessagingChannel } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

export type InboundMessageEffectsInput = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
};

async function resolveConversationContact(
  admin: MessagingDbClient,
  conversationId: string,
): Promise<{ contactId: string; contactName: string } | null> {
  const { data: conversation } = await admin
    .from("conversations")
    .select("contact_id, contact:contacts(name)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation?.contact_id) {
    return null;
  }

  const contact = Array.isArray(conversation.contact)
    ? conversation.contact[0]
    : conversation.contact;

  return {
    contactId: conversation.contact_id,
    contactName: contact?.name ?? "Customer",
  };
}

export async function processInboundMessageEffects(
  input: InboundMessageEffectsInput,
): Promise<void> {
  const contact = await resolveConversationContact(
    input.admin,
    input.conversationId,
  );

  if (!contact) {
    return;
  }

  const { contactId, contactName } = contact;
  const message = input.clientMessage;

  await processInboundMessageAutomations({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    conversationId: input.conversationId,
    contactId,
    contactName,
    message,
  });

  await analyzeAndStoreSentiment({
    admin: input.admin,
    businessId: input.businessId,
    contactId,
    message,
  });

  await processSalesAgentRules({
    admin: input.admin,
    businessId: input.businessId,
    contactId,
    message,
  });

  await processHighIntentTaskRule({
    admin: input.admin,
    businessId: input.businessId,
    contactId,
    message,
  });
}

export function scheduleInboundMessageEffects(
  input: InboundMessageEffectsInput,
): void {
  void processInboundMessageEffects(input).catch((error) => {
    console.error("[inbound-effects] failed", error);
  });
}
