import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/services/llm.service";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
} from "@/services/messaging.service";
import { notifyNewLeadPush } from "@/services/push-notifications.service";
import { sendTelegramChatMessage } from "@/services/telegram.service";
import type {
  AutomationActionType,
  AutomationConfig,
  AutomationTriggerType,
} from "@/features/automations/workflow-types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { Database, MessagingChannel } from "@/types/database.types";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";

type AutomationDbClient = SupabaseClient<Database>;

type AutomationWorkflowRow = {
  id: string;
  business_id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  enabled: boolean;
  config: unknown;
};

export type AutomationTriggerContext = {
  businessId: string;
  trigger: AutomationTriggerType;
  channel: MessagingChannel;
  conversationId: string;
  contactId: string;
  contactName: string;
  message?: string;
  addedTag?: string;
};

const HOUR_MS = 60 * 60 * 1000;

function matchesChannel(config: AutomationConfig, channel: MessagingChannel): boolean {
  if (!config.channels?.length) {
    return true;
  }

  return config.channels.includes(channel as MessagingIntegrationChannelId);
}

function matchesTagTrigger(config: AutomationConfig, addedTag?: string): boolean {
  if (!config.tagName?.trim()) {
    return true;
  }

  if (!addedTag) {
    return false;
  }

  return addedTag.trim().toLowerCase() === config.tagName.trim().toLowerCase();
}

async function hasRecentRun(
  admin: AutomationDbClient,
  automationId: string,
  conversationId: string | null,
  trigger: AutomationTriggerType,
  hours = 24,
): Promise<boolean> {
  const since = new Date(Date.now() - hours * HOUR_MS).toISOString();
  let query = admin
    .from("automation_runs")
    .select("id")
    .eq("automation_id", automationId)
    .eq("trigger_type", trigger)
    .gte("created_at", since)
    .limit(1);

  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }

  const { data } = await query;
  return Boolean(data?.length);
}

async function logAutomationRun(
  admin: AutomationDbClient,
  input: {
    automationId: string;
    businessId: string;
    conversationId: string | null;
    contactId: string | null;
    trigger: AutomationTriggerType;
    action: AutomationActionType;
    status: "success" | "failed" | "skipped";
    detail?: string;
  },
): Promise<void> {
  await admin.from("automation_runs").insert({
    automation_id: input.automationId,
    business_id: input.businessId,
    conversation_id: input.conversationId,
    contact_id: input.contactId,
    trigger_type: input.trigger,
    action_type: input.action,
    status: input.status,
    detail: input.detail ?? null,
  });
}

async function loadAgent(
  admin: AutomationDbClient,
  businessId: string,
  aiAgentId: string | null,
) {
  if (!aiAgentId) {
    return null;
  }

  const { data } = await admin
    .from("ai_agents")
    .select("id, system_prompt, provider, model, language, enabled")
    .eq("id", aiAgentId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data?.enabled) {
    return null;
  }

  return data;
}

async function sendAutomationMessage(
  admin: AutomationDbClient,
  input: {
    businessId: string;
    channel: MessagingChannel;
    conversationId: string;
    content: string;
    aiAgentId: string | null;
  },
): Promise<boolean> {
  if (input.channel === "website_forms") {
    await insertChannelMessage(admin, {
      conversationId: input.conversationId,
      channel: input.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
      aiAgentId: input.aiAgentId,
    });
    return true;
  }

  if (input.channel === "whatsapp") {
    const { data: conversation } = await admin
      .from("conversations")
      .select("contact:contacts(phone_number)")
      .eq("id", input.conversationId)
      .maybeSingle();

    const contact = Array.isArray(conversation?.contact)
      ? conversation.contact[0]
      : conversation?.contact;

    const { data: whatsappConnection } = await admin
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", input.businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (
      !contact?.phone_number ||
      !whatsappConnection?.meta_phone_number_id ||
      !whatsappConnection.meta_access_token
    ) {
      return false;
    }

    const sendResult = await sendWhatsAppTextMessage(
      whatsappConnection.meta_phone_number_id,
      whatsappConnection.meta_access_token,
      contact.phone_number.replace(/[^\d+]/g, ""),
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }

    await insertChannelMessage(admin, {
      conversationId: input.conversationId,
      channel: input.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
      aiAgentId: input.aiAgentId,
    });
  } else if (input.channel === "instagram") {
    return false;
  } else if (input.channel === "telegram") {
    const sendResult = await sendTelegramChatMessage(
      input.businessId,
      input.conversationId,
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }
  } else {
    return false;
  }

  await incrementMessagingAnalytics(admin, input.businessId, input.channel, {
    totalMessages: 1,
    aiReplies: 1,
  });

  return true;
}

async function executeWorkflowAction(
  admin: AutomationDbClient,
  workflow: AutomationWorkflowRow,
  context: AutomationTriggerContext,
): Promise<{ success: boolean; detail?: string }> {
  const config = (workflow.config ?? { channels: [] }) as AutomationConfig;
  const action = workflow.action_type as AutomationActionType;

  if (action === "send_message") {
    const agent = await loadAgent(admin, context.businessId, config.aiAgentId ?? null);
    const fallback = `Hi ${context.contactName}, thanks for reaching out — how can we help you today?`;

    let content = fallback;

    if (hasGeminiEnv() || agent) {
      const result = await generateText({
        businessId: context.businessId,
        provider: agent?.provider as "gemini" | "openai" | "claude" | undefined,
        model: agent?.model ?? undefined,
        prompt: [
          `Customer name: ${context.contactName}`,
          context.message ? `Latest message: ${context.message}` : null,
          "Write a short helpful reply (max 280 chars). No markdown.",
        ]
          .filter(Boolean)
          .join("\n"),
        systemInstruction: agent
          ? `${agent.system_prompt}\n\nWrite one concise reply message.`
          : "You write short helpful business replies.",
      });

      if (result.success) {
        content = result.data.text.trim().slice(0, 500);
      }
    }

    const sent = await sendAutomationMessage(admin, {
      businessId: context.businessId,
      channel: context.channel,
      conversationId: context.conversationId,
      content,
      aiAgentId: agent?.id ?? null,
    });

    return sent
      ? { success: true, detail: "Message sent" }
      : { success: false, detail: "Unable to send message" };
  }

  if (action === "create_task") {
    const title =
      config.taskTitle?.trim() ||
      `Follow up: ${context.contactName} (${workflow.name})`;
    const dueAt = new Date(Date.now() + 24 * HOUR_MS).toISOString();

    const { error } = await admin.from("crm_tasks").insert({
      business_id: context.businessId,
      contact_id: context.contactId,
      title,
      due_at: dueAt,
      status: "open",
    });

    return error
      ? { success: false, detail: error.message }
      : { success: true, detail: title };
  }

  if (action === "update_stage") {
    const stage = config.pipelineStage ?? "qualified";
    const { error } = await admin
      .from("contacts")
      .update({ pipeline_stage: stage })
      .eq("id", context.contactId)
      .eq("business_id", context.businessId);

    return error
      ? { success: false, detail: error.message }
      : { success: true, detail: `Stage → ${stage}` };
  }

  if (action === "notify") {
    await notifyNewLeadPush({
      businessId: context.businessId,
      contactId: context.contactId,
      contactName: context.contactName,
      channel: context.channel,
      preview: config.notifyTitle?.trim() || workflow.name,
    });

    return { success: true, detail: "Team notified" };
  }

  return { success: false, detail: "Unknown action" };
}

async function listEnabledWorkflows(
  admin: AutomationDbClient,
  businessId: string,
  trigger: AutomationTriggerType,
): Promise<AutomationWorkflowRow[]> {
  const { data } = await admin
    .from("automations")
    .select("id, business_id, name, trigger_type, action_type, enabled, config")
    .eq("business_id", businessId)
    .eq("trigger_type", trigger)
    .eq("enabled", true);

  return data ?? [];
}

export async function runAutomationsForTrigger(
  context: AutomationTriggerContext,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();
  const workflows = await listEnabledWorkflows(
    admin,
    context.businessId,
    context.trigger,
  );

  for (const workflow of workflows) {
    const config = (workflow.config ?? { channels: [] }) as AutomationConfig;

    if (!matchesChannel(config, context.channel)) {
      continue;
    }

    if (context.trigger === "tag_added" && !matchesTagTrigger(config, context.addedTag)) {
      continue;
    }

    if (
      await hasRecentRun(
        admin,
        workflow.id,
        context.conversationId,
        context.trigger,
      )
    ) {
      await logAutomationRun(admin, {
        automationId: workflow.id,
        businessId: context.businessId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        trigger: context.trigger,
        action: workflow.action_type as AutomationActionType,
        status: "skipped",
        detail: "Already ran in the last 24h",
      });
      continue;
    }

    const result = await executeWorkflowAction(admin, workflow, context);

    await logAutomationRun(admin, {
      automationId: workflow.id,
      businessId: context.businessId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      trigger: context.trigger,
      action: workflow.action_type as AutomationActionType,
      status: result.success ? "success" : "failed",
      detail: result.detail,
    });
  }
}

export async function runNoReplyCustomAutomations(): Promise<{
  processed: number;
  executed: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, executed: 0 };
  }

  const admin = createAdminClient();
  const now = Date.now();
  let processed = 0;
  let executed = 0;

  const { data: businesses } = await admin
    .from("automations")
    .select("business_id")
    .eq("trigger_type", "no_reply_24h")
    .eq("enabled", true);

  const businessIds = [...new Set((businesses ?? []).map((row) => row.business_id))];

  for (const businessId of businessIds) {
    const { data: conversations } = await admin
      .from("conversations")
      .select("id, channel, contact:contacts(id, name)")
      .eq("business_id", businessId)
      .in("status", ["open", "pending", "active"])
      .in("channel", ["whatsapp", "instagram", "telegram", "website_forms"])
      .limit(100);

    for (const conversation of conversations ?? []) {
      const { data: messages } = await admin
        .from("messages")
        .select("sender_type, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      const rows = messages ?? [];
      const last = rows.at(-1);

      if (!last || last.sender_type === "client") {
        continue;
      }

      const lastOutboundAt = new Date(last.created_at).getTime();

      if (now < lastOutboundAt + 24 * HOUR_MS) {
        continue;
      }

      const hasClientReplyAfter = rows.some(
        (message) =>
          message.sender_type === "client" &&
          new Date(message.created_at).getTime() > lastOutboundAt,
      );

      if (hasClientReplyAfter) {
        continue;
      }

      processed += 1;

      const contact = Array.isArray(conversation.contact)
        ? conversation.contact[0]
        : conversation.contact;

      if (!contact?.id) {
        continue;
      }

      const beforeRuns = await admin
        .from("automation_runs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("trigger_type", "no_reply_24h")
        .gte("created_at", new Date(lastOutboundAt).toISOString());

      await runAutomationsForTrigger({
        businessId,
        trigger: "no_reply_24h",
        channel: conversation.channel,
        conversationId: conversation.id,
        contactId: contact.id,
        contactName: contact.name ?? "Customer",
      });

      const afterRuns = await admin
        .from("automation_runs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("trigger_type", "no_reply_24h")
        .gte("created_at", new Date(lastOutboundAt).toISOString());

      if ((afterRuns.count ?? 0) > (beforeRuns.count ?? 0)) {
        executed += 1;
      }
    }
  }

  return { processed, executed };
}

export async function processInboundMessageAutomations(input: {
  admin: AutomationDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  contactId: string;
  contactName: string;
  message: string;
}): Promise<void> {
  await runAutomationsForTrigger({
    businessId: input.businessId,
    trigger: "new_message",
    channel: input.channel,
    conversationId: input.conversationId,
    contactId: input.contactId,
    contactName: input.contactName,
    message: input.message,
  });
}

export async function processFormSubmitAutomations(input: {
  businessId: string;
  conversationId: string;
  contactId: string;
  contactName: string;
  message: string;
}): Promise<void> {
  await runAutomationsForTrigger({
    businessId: input.businessId,
    trigger: "form_submit",
    channel: "website_forms",
    conversationId: input.conversationId,
    contactId: input.contactId,
    contactName: input.contactName,
    message: input.message,
  });
}

export async function processTagAddedAutomations(input: {
  businessId: string;
  contactId: string;
  contactName: string;
  channel: MessagingChannel;
  conversationId: string | null;
  addedTag: string;
}): Promise<void> {
  if (!input.conversationId) {
    return;
  }

  await runAutomationsForTrigger({
    businessId: input.businessId,
    trigger: "tag_added",
    channel: input.channel,
    conversationId: input.conversationId,
    contactId: input.contactId,
    contactName: input.contactName,
    addedTag: input.addedTag,
  });
}
