import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { buildAssistantSystemPrompt } from "@/lib/ai-assistant/build-assistant-system-prompt";
import {
  AI_CONTEXT_LIMITS,
  resolveHistoryMessageLimit,
  trimConversationHistory,
  trimKnowledgeEntriesByTokenBudget,
} from "@/lib/ai/context-window";
import {
  buildCrmReplyContext,
  formatCrmContextForSystemPrompt,
  type CrmReplyContactSnapshot,
} from "@/lib/ai/crm-reply-context";
import { runAutoReplyOrchestrator } from "@/services/ai-orchestrator.service";
import {
  buildHumanHandoffFollowUpMessage,
  createAiHumanRequest,
} from "@/services/ai-human-request.service";
import {
  applyPreparedExecutorPlan,
  loadContactSnapshot,
} from "@/services/agent-task-executor.service";
import { resolveAssistantFallbackReplyMessage } from "@/lib/ai/fallback-reply";
import type { AiProvider } from "@/lib/ai/constants";
import { generateAssistantReplyWithFallback } from "@/services/llm.service";
import { logOrchestratorAgentRun } from "@/services/agent-run-log.service";
import { getDefaultAiAssistantProfile } from "@/services/ai-assistant-profile.service";
import { getDefaultGeminiModel } from "@/lib/env";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import type { ExecutorPlan } from "@/types/agent-executor.types";
import { retrieveKnowledgeForMessage } from "@/services/knowledge-retrieval.service";
import {
  formatConversationSummaryForSystemPrompt,
  loadConversationMemory,
  refreshConversationSummaryIfNeeded,
} from "@/services/conversation-memory.service";
import type { Database, MessagingChannel } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AutoReplyGenerationSuccess = {
  success: true;
  text: string;
  matchedAgentId: string | null;
  matchedAgentName: string | null;
  provider: AiProvider;
  model: string;
  isFallback?: boolean;
  language: string;
};

export type AutoReplyGenerationFailure = {
  success: false;
  reason: "ai_disabled" | "settings_missing" | "llm_failed";
  message?: string;
};

export type AutoReplyGenerationResult =
  | AutoReplyGenerationSuccess
  | AutoReplyGenerationFailure;

type AutoReplyPrep = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  clientMessage: string;
  conversationId?: string | null;
  conversationHistory: ConversationTurn[];
  conversationSummary: string | null;
  crmContext: string;
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
  systemPrompt: string;
  provider: AiProvider;
  model: string;
  language: string;
  fallbackReplyMessage: string | null;
  knowledgeEntries: Awaited<ReturnType<typeof retrieveKnowledgeForMessage>>;
  contactId: string | null;
};

async function fetchConversationHistory(
  admin: MessagingDbClient,
  conversationId: string,
  limit: number = AI_CONTEXT_LIMITS.defaultHistoryMessages,
): Promise<ConversationTurn[]> {
  const { data } = await admin
    .from("messages")
    .select("sender_type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return [...(data ?? [])]
    .reverse()
    .map((message) => ({
      role:
        message.sender_type === "client"
          ? ("user" as const)
          : ("assistant" as const),
      content: message.content,
    }));
}

function mapKnowledgeForLlm(
  entries: Awaited<ReturnType<typeof retrieveKnowledgeForMessage>>,
) {
  return entries.map((entry) => ({
    title: entry.title,
    content: entry.content,
    category: entry.category ?? "",
  }));
}

async function resolveAssistantProfile(
  admin: MessagingDbClient,
  businessId: string,
) {
  const { data } = await admin
    .from("ai_assistant_profile")
    .select(
      "business_id, name, system_prompt, communication_style, language, fallback_reply_message, can_reply, can_create_task, can_create_deal, can_update_contact, can_create_calendar_event, can_request_human, can_notify_owner",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (data) {
    return {
      businessId: data.business_id,
      name: data.name,
      systemPrompt: data.system_prompt,
      communicationStyle: data.communication_style,
      language: data.language,
      fallbackReplyMessage: data.fallback_reply_message,
      canReply: data.can_reply ?? true,
      canCreateTask: data.can_create_task ?? true,
      canCreateDeal: data.can_create_deal ?? true,
      canUpdateContact: data.can_update_contact ?? true,
      canCreateCalendarEvent: data.can_create_calendar_event ?? false,
      canRequestHuman: data.can_request_human ?? true,
      canNotifyOwner: data.can_notify_owner ?? true,
    };
  }

  const defaults = getDefaultAiAssistantProfile(businessId);
  await admin.from("ai_assistant_profile").insert({
    business_id: businessId,
    name: defaults.name,
    system_prompt: defaults.systemPrompt,
    communication_style: defaults.communicationStyle,
    language: defaults.language,
    can_reply: defaults.canReply,
    can_create_task: defaults.canCreateTask,
    can_create_deal: defaults.canCreateDeal,
    can_update_contact: defaults.canUpdateContact,
    can_create_calendar_event: defaults.canCreateCalendarEvent,
    can_request_human: defaults.canRequestHuman,
    can_notify_owner: defaults.canNotifyOwner,
  });

  return { ...defaults, fallbackReplyMessage: null };
}

async function resolveConversationContactId(
  admin: MessagingDbClient,
  conversationId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("conversations")
    .select("contact_id")
    .eq("id", conversationId)
    .maybeSingle();

  return data?.contact_id ?? null;
}

async function fetchBusinessSubscriptionPlan(
  admin: MessagingDbClient,
  businessId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("businesses")
    .select("subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  return data?.subscription_plan ?? null;
}

async function fetchCrmReplySnapshot(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string | null,
): Promise<CrmReplyContactSnapshot | null> {
  if (!contactId) {
    return null;
  }

  const [{ data: contact }, { count: openTaskCount }] = await Promise.all([
    admin
      .from("contacts")
      .select(
        "name, pipeline_stage, deal_value, lead_score, ai_summary, expected_close_date",
      )
      .eq("id", contactId)
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .eq("business_id", businessId)
      .eq("status", "open"),
  ]);

  if (!contact) {
    return null;
  }

  return {
    name: contact.name,
    pipelineStage: contact.pipeline_stage,
    dealValue: contact.deal_value,
    leadScore: contact.lead_score,
    expectedCloseDate: contact.expected_close_date,
    aiSummary: contact.ai_summary,
    openTaskCount: openTaskCount ?? 0,
  };
}

function applyAgentPermissionsToPlan(
  plan: ExecutorPlan,
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>,
): ExecutorPlan {
  return {
    clientSummary: plan.clientSummary,
    contactUpdates: profile.canUpdateContact ? plan.contactUpdates : undefined,
    actions: plan.actions.filter((action) => {
      if (action.type === "create_task") {
        return profile.canCreateTask;
      }

      if (action.type === "create_deal") {
        return profile.canCreateDeal;
      }

      if (action.type === "create_calendar_event") {
        return profile.canCreateCalendarEvent;
      }

      return true;
    }),
  };
}

function assembleAutoReplySystemPrompt(input: {
  baseSystemPrompt: string;
  conversationSummary: string | null;
  crmContext: string;
}): string {
  const sections = [input.baseSystemPrompt];
  const summarySection = formatConversationSummaryForSystemPrompt(
    input.conversationSummary,
  );
  const crmSection = formatCrmContextForSystemPrompt(input.crmContext);

  if (summarySection) {
    sections.push(summarySection);
  }

  if (crmSection) {
    sections.push(crmSection);
  }

  return sections.join("\n\n");
}

function buildPrepFromProfile(input: {
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
  conversationSummary: string | null;
  crmContext: string;
}): {
  systemPrompt: string;
  provider: AiProvider;
  model: string;
  language: string;
} {
  return {
    systemPrompt: assembleAutoReplySystemPrompt({
      baseSystemPrompt: buildAssistantSystemPrompt(input.profile),
      conversationSummary: input.conversationSummary,
      crmContext: input.crmContext,
    }),
    provider: "gemini",
    model: getDefaultGeminiModel(),
    language: input.profile.language,
  };
}

async function ensureChannelAiSettingsRow(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
): Promise<boolean> {
  const { data } = await admin
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  if (data) {
    return data.ai_enabled;
  }

  await admin.from("ai_settings").insert({
    business_id: businessId,
    channel,
    provider: "gemini",
    model: getDefaultGeminiModel(),
    language: DEFAULT_AI_LANGUAGE,
    system_prompt: DEFAULT_AI_SYSTEM_PROMPT,
    ai_enabled: false,
  });

  return false;
}

async function prepareAutoReplyContext(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  clientMessage: string;
  conversationId?: string | null;
  conversationHistory?: ConversationTurn[];
  requireAiEnabled?: boolean;
}): Promise<
  | { success: true; prep: AutoReplyPrep }
  | { success: false; failure: AutoReplyGenerationFailure }
> {
  const requireAiEnabled = input.requireAiEnabled ?? true;

  const aiEnabled = await ensureChannelAiSettingsRow(
    input.admin,
    input.businessId,
    input.channel,
  );

  if (requireAiEnabled && !aiEnabled) {
    return {
      success: false,
      failure: { success: false, reason: "ai_disabled" },
    };
  }

  const [profile, subscriptionPlan] = await Promise.all([
    resolveAssistantProfile(input.admin, input.businessId),
    fetchBusinessSubscriptionPlan(input.admin, input.businessId),
  ]);

  const historyLimit = resolveHistoryMessageLimit(subscriptionPlan);
  const contactId =
    input.conversationId != null
      ? await resolveConversationContactId(input.admin, input.conversationId)
      : null;

  const [conversationHistory, knowledgeEntries, crmSnapshot, conversationMemory] =
    await Promise.all([
      input.conversationHistory ??
        (input.conversationId
          ? fetchConversationHistory(
              input.admin,
              input.conversationId,
              historyLimit,
            )
          : Promise.resolve([])),
      retrieveKnowledgeForMessage({
        admin: input.admin,
        businessId: input.businessId,
        query: input.clientMessage,
      }),
      fetchCrmReplySnapshot(input.admin, input.businessId, contactId),
      input.conversationId
        ? loadConversationMemory(input.admin, input.conversationId)
        : Promise.resolve(null),
    ]);

  const trimmedHistory = trimConversationHistory(
    conversationHistory,
    historyLimit,
  );
  const trimmedKnowledge = trimKnowledgeEntriesByTokenBudget(
    knowledgeEntries,
    AI_CONTEXT_LIMITS.maxKnowledgeEntries,
    4_000,
  );

  const crmContext = buildCrmReplyContext(crmSnapshot);
  const voice = buildPrepFromProfile({
    profile,
    conversationSummary: conversationMemory?.aiSummary ?? null,
    crmContext,
  });

  return {
    success: true,
    prep: {
      admin: input.admin,
      businessId: input.businessId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      conversationId: input.conversationId,
      conversationHistory: trimmedHistory,
      conversationSummary: conversationMemory?.aiSummary ?? null,
      crmContext,
      profile,
      systemPrompt: voice.systemPrompt,
      provider: voice.provider,
      model: voice.model,
      language: voice.language,
      knowledgeEntries: trimmedKnowledge,
      fallbackReplyMessage: profile.fallbackReplyMessage,
      contactId,
    },
  };
}

/** Reply first with the single AI Agent profile. */
export async function generateFastAssistantReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  clientMessage: string;
  conversationId?: string | null;
  conversationHistory?: ConversationTurn[];
  requireAiEnabled?: boolean;
}): Promise<AutoReplyGenerationResult> {
  const prepared = await prepareAutoReplyContext(input);

  if (!prepared.success) {
    return prepared.failure;
  }

  const { prep } = prepared;

  if (!prep.profile.canReply) {
    return { success: false, reason: "ai_disabled" };
  }

  const voice = buildPrepFromProfile({
    profile: prep.profile,
    conversationSummary: prep.conversationSummary,
    crmContext: prep.crmContext,
  });

  const reply = await generateAssistantReplyWithFallback({
    businessId: prep.businessId,
    conversationId: prep.conversationId ?? undefined,
    callType: "auto_reply",
    preferredProvider: voice.provider,
    model: voice.model,
    systemPrompt: voice.systemPrompt,
    language: voice.language,
    userMessage: prep.clientMessage,
    knowledgeContext: mapKnowledgeForLlm(prep.knowledgeEntries),
    conversationHistory: prep.conversationHistory,
  });

  if (!reply.success) {
    const fallbackText = resolveAssistantFallbackReplyMessage({
      language: voice.language,
      customMessage: prep.fallbackReplyMessage,
    });

    return {
      success: true,
      text: fallbackText,
      matchedAgentId: null,
      matchedAgentName: prep.profile.name,
      provider: voice.provider,
      model: voice.model,
      language: voice.language,
      isFallback: true,
    };
  }

  if (prep.conversationId) {
    void refreshConversationSummaryIfNeeded({
      admin: prep.admin,
      businessId: prep.businessId,
      conversationId: prep.conversationId,
    });
  }

  return {
    success: true,
    text: reply.data.text,
    matchedAgentId: null,
    matchedAgentName: prep.profile.name,
    provider: reply.usedProvider ?? voice.provider,
    model: reply.data.model,
    language: voice.language,
  };
}

/** Background: orchestrator + CRM + owner alert (+ optional follow-up to customer). */
export async function runAutoReplyBackgroundOrchestration(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
  language: string;
  sendFollowUp?: (text: string) => Promise<{ success: boolean }>;
}): Promise<void> {
  const subscriptionPlan = await fetchBusinessSubscriptionPlan(
    input.admin,
    input.businessId,
  );
  const historyLimit = resolveHistoryMessageLimit(subscriptionPlan);
  const profile = await resolveAssistantProfile(input.admin, input.businessId);

  const conversationHistory = await fetchConversationHistory(
    input.admin,
    input.conversationId,
    historyLimit,
  );

  const contactId = await resolveConversationContactId(
    input.admin,
    input.conversationId,
  );

  const contact =
    contactId != null
      ? await loadContactSnapshot(input.admin, input.businessId, contactId)
      : null;

  const orchestrationResult = await runAutoReplyOrchestrator({
    businessId: input.businessId,
    message: input.clientMessage,
    conversationHistory,
    contact,
  });

  if (!orchestrationResult.success) {
    await logOrchestratorAgentRun(input.admin, {
      businessId: input.businessId,
      conversationId: input.conversationId,
      contactId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      success: false,
      errorMessage: `[${orchestrationResult.errorCode}] ${orchestrationResult.errorMessage}`,
    });

    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return;
  }

  const orchestration = orchestrationResult.data;

  if (contactId != null) {
    await applyPreparedExecutorPlan({
      admin: input.admin,
      businessId: input.businessId,
      contactId,
      conversationId: input.conversationId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      agent: null,
      goal: null,
      routingMethod: "none",
      plan: applyAgentPermissionsToPlan(
        orchestratorResponseToExecutorPlan(orchestration),
        profile,
      ),
    });
  }

  if (
    !orchestration.needsHuman ||
    !profile.canRequestHuman ||
    !profile.canNotifyOwner
  ) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return;
  }

  const humanReason =
    orchestration.humanReason?.trim() || "Customer needs a real person";

  await createAiHumanRequest({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    contactId,
    contactName: contact?.name,
    reason: humanReason,
    messagePreview: input.clientMessage,
  });

  if (!input.sendFollowUp) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return;
  }

  const followUpText = buildHumanHandoffFollowUpMessage(input.language);
  const followUpResult = await input.sendFollowUp(followUpText);

  if (!followUpResult.success) {
    console.warn(
      "[auto-reply-pipeline]",
      JSON.stringify({ error: "human_follow_up_send_failed" }),
    );
  }

  void refreshConversationSummaryIfNeeded({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
  });
}

/** @deprecated Prefer generateFastAssistantReply for inbound auto-reply. */
export async function generateChannelAutoReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  clientMessage: string;
  conversationId?: string | null;
  conversationHistory?: ConversationTurn[];
  requireAiEnabled?: boolean;
}): Promise<AutoReplyGenerationResult> {
  return generateFastAssistantReply(input);
}

export async function isChannelAutoReplyEnabled(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
}): Promise<boolean> {
  return ensureChannelAiSettingsRow(
    input.admin,
    input.businessId,
    input.channel,
  );
}
