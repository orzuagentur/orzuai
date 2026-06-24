import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAiActionNotification } from "@/services/business-notifications.service";
import {
  scheduleAgentActionPush,
  type AgentActionPushInput,
} from "@/services/push-notifications.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import {
  filterCustomerVisibleActionLabels,
  messagesAreLikelyDuplicates,
  sanitizeCustomerFacingSummary,
  shouldSendCustomerActionFollowUp,
} from "@/utils/customer-facing-agent-summary";

type MessagingDbClient = SupabaseClient<Database>;

export type AgentActionReportProfile = {
  name: string;
  language: string;
  canAddInternalNote: boolean;
  canNotifyOnActions: boolean;
  canNotifyOwner: boolean;
  canSummarizeActionsInChat: boolean;
};

function formatTimestamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

export function buildCustomerFacingActionSummary(input: {
  agentName: string;
  language: string;
  actionsApplied: string[];
  clientSummary?: string;
}): string | null {
  const custom = sanitizeCustomerFacingSummary(input.clientSummary);

  if (custom) {
    return custom;
  }

  const visibleActions = filterCustomerVisibleActionLabels(input.actionsApplied);

  if (visibleActions.length === 0) {
    return null;
  }

  const actionsText = visibleActions.join("; ");
  const language = input.language.trim();

  if (language === "Russian") {
    return `Готово: ${actionsText}.`;
  }

  if (language === "Uzbek") {
    return `Tayyor: ${actionsText}.`;
  }

  return `Done: ${actionsText}.`;
}

async function appendConversationInternalNoteAdmin(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    conversationId: string;
    agentName: string;
    noteLine: string;
  },
): Promise<void> {
  const { data } = await admin
    .from("conversations")
    .select("internal_note")
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const timestamp = formatTimestamp();
  const line = `[${timestamp}] ${input.agentName} (actions): ${input.noteLine.trim()}`;
  const existing = data?.internal_note?.trim() ?? "";
  const nextNote = existing ? `${existing}\n\n${line}` : line;

  await admin
    .from("conversations")
    .update({ internal_note: nextNote.slice(0, 8000) })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId);
}

export async function reportAgentActions(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactName?: string | null;
  profile: AgentActionReportProfile;
  actionsApplied: string[];
  clientSummary?: string;
  sendFollowUp?: (text: string) => Promise<{ success: boolean }>;
}): Promise<void> {
  if (input.actionsApplied.length === 0) {
    return;
  }

  const actionsText = input.actionsApplied.join("; ");
  const agentName = input.profile.name.trim() || "AI Agent";

  if (input.profile.canAddInternalNote) {
    await appendConversationInternalNoteAdmin(input.admin, {
      businessId: input.businessId,
      conversationId: input.conversationId,
      agentName,
      noteLine: actionsText,
    });
  }

  await createAiActionNotification({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    contactName: input.contactName,
    agentName,
    actionsApplied: input.actionsApplied,
  });

  if (input.profile.canNotifyOnActions && input.profile.canNotifyOwner) {
    const pushInput: AgentActionPushInput = {
      businessId: input.businessId,
      conversationId: input.conversationId,
      channel: input.channel,
      contactName: input.contactName ?? "Customer",
      agentName,
      actionsSummary: actionsText,
    };

    scheduleAgentActionPush(pushInput);
  }

  if (!input.sendFollowUp || !input.profile.canSummarizeActionsInChat) {
    return;
  }

  if (
    !shouldSendCustomerActionFollowUp({
      actionsApplied: input.actionsApplied,
      clientSummary: input.clientSummary,
    })
  ) {
    return;
  }

  const customerSummary = buildCustomerFacingActionSummary({
    agentName,
    language: input.profile.language,
    actionsApplied: input.actionsApplied,
    clientSummary: input.clientSummary,
  });

  if (!customerSummary) {
    return;
  }

  const { data: recentAiMessage } = await input.admin
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", input.conversationId)
    .eq("sender_type", "ai")
    .eq("hidden_for_business", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentAiMessage?.content) {
    const ageMs =
      Date.now() - new Date(recentAiMessage.created_at).getTime();

    if (
      ageMs < 2 * 60 * 1000 &&
      messagesAreLikelyDuplicates(recentAiMessage.content, customerSummary)
    ) {
      return;
    }
  }

  const followUpResult = await input.sendFollowUp(customerSummary);

  if (!followUpResult.success) {
    console.warn(
      "[agent-action-report]",
      JSON.stringify({ error: "action_summary_send_failed" }),
    );
  }
}
