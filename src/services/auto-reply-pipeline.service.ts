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
import { isPlatformFeatureAllowed } from "@/services/platform-business-controls.service";
import { runAutoReplyOrchestrator } from "@/services/ai-orchestrator.service";
import {
  formatCalendarResourcesForAiPrompt,
  getBusinessBookingSetup,
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";
import {
  formatBookingPagesForAiPrompt,
  isCalendarBookingEnabled,
} from "@/services/ai-calendar-booking.service";
import { formatAvailabilityForAiPrompt } from "@/services/calendar-availability.service";
import { listPublishedBookingPagesForBusinessAdmin } from "@/services/booking-pages.service";
import {
  buildHumanHandoffFollowUpMessage,
  createAiHumanRequest,
} from "@/services/ai-human-request.service";
import {
  applyPreparedExecutorPlan,
  applyCreateContactFromPlan,
  loadContactSnapshot,
} from "@/services/agent-task-executor.service";
import {
  buildCustomerFacingActionSummary,
  reportAgentActions,
} from "@/services/agent-action-reporting.service";
import {
  isLikelyBookingOrOrderMessage,
  resolveAssistantFallbackReplyMessage,
} from "@/lib/ai/fallback-reply";
import { messagesAreLikelyDuplicates } from "@/utils/customer-facing-agent-summary";
import { sanitizeWorkerFacingReply } from "@/lib/ai/worker-reply-safety";
import { resolveManagerHandoffPlan } from "@/utils/human-handoff-policy";
import { resolveLlmModel, type AiProvider } from "@/lib/ai/constants";
import { getPrimaryPlatformLlmProvider } from "@/lib/ai/platform-llm-config";
import { generateAssistantReplyWithFallback } from "@/services/llm.service";
import {
  buildAgentOpsActions,
  logAgentOpsRun,
  logOrchestratorAgentRun,
} from "@/services/agent-run-log.service";
import { getDefaultAiAssistantProfile } from "@/services/ai-assistant-profile.service";
import {
  ensurePlatformPromptsLoaded,
  touchPlatformPromptUsage,
} from "@/services/platform-prompts.service";
import {
  computeCollectionGaps,
  formatCollectionGapsForPrompt,
  isCollectionNiche,
  parseDataCollectionFields,
  type CollectionNiche,
  type DataCollectionField,
} from "@/lib/ai/data-collection";
import { filterExecutorPlanByProfile } from "@/lib/ai/tools";
import type { ExecutorPlan } from "@/types/agent-executor.types";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import { processSalesAgentRules } from "@/services/sales-agent.service";
import { retrieveKnowledgeForMessage } from "@/services/knowledge-retrieval.service";
import {
  formatConversationSummaryForSystemPrompt,
  loadConversationMemory,
  refreshConversationSummaryIfNeeded,
} from "@/services/conversation-memory.service";
import { isAgentWithinSchedule } from "@/lib/ai/agent-schedule";
import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";
import { agentScheduleSlotsSchema } from "@/types/ai-assistant-schedule.types";
import type { Database, MessagingChannel } from "@/types/database.types";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageRepository } from "@/repositories/message.repository";

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
  /** True when CRM/calendar worker actions already ran in this turn. */
  orchestrationCompleted?: boolean;
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
  bookingContext: string;
  knowledgeGuidance: string;
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
  businessId: string,
  limit: number = AI_CONTEXT_LIMITS.defaultHistoryMessages,
): Promise<ConversationTurn[]> {
  const messageRepo = getMessageRepository(admin);
  const visibleMessages = [
    ...(await messageRepo.listForAiHistory(conversationId, businessId, limit)),
  ].reverse();
  const outboundMessageIds = visibleMessages
    .filter((message) => message.sender_type !== "client")
    .map((message) => message.id);
  const failedMessageIds = new Set<string>();

  if (outboundMessageIds.length > 0) {
    const { data: failedDeliveries } = await admin
      .from("message_deliveries")
      .select("message_id")
      .in("message_id", outboundMessageIds)
      .eq("status", "failed");

    for (const delivery of failedDeliveries ?? []) {
      failedMessageIds.add(delivery.message_id);
    }
  }

  return visibleMessages
    .filter((message) => !failedMessageIds.has(message.id))
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
    id: entry.id,
    citation: entry.citation,
    title: entry.title,
    content: entry.content,
    category: entry.category ?? "General",
  }));
}

async function buildFastBookingReplyContext(input: {
  businessId: string;
  clientMessage: string;
}): Promise<string> {
  if (!isLikelyBookingOrOrderMessage(input.clientMessage)) {
    return "";
  }

  try {
    const [bookingSetup, calendarResources, bookingPages] = await Promise.all([
      getBusinessBookingSetup(input.businessId),
      listBusinessCalendarResources(input.businessId),
      listPublishedBookingPagesForBusinessAdmin(input.businessId),
    ]);
    const calendarBookingEnabled =
      calendarResources.length > 0 || bookingPages.length > 0;
    const bookableResourcesText = formatCalendarResourcesForAiPrompt(
      calendarResources,
      bookingSetup,
    );
    const bookingPagesText = formatBookingPagesForAiPrompt(bookingPages);
    const availabilityText = calendarBookingEnabled
      ? await formatAvailabilityForAiPrompt(input.businessId)
      : "";

    return [
      "Live booking/order context for this customer message:",
      calendarBookingEnabled
        ? "Calendar booking is enabled. If date/time is clear, the system books in this turn — confirm the outcome when action results are provided. If date/time is missing, ask exactly one clear question."
        : "Calendar booking is not configured yet. Ask only for the missing date/time/contact detail, capture the request as a task, and never promise a manager callback.",
      "Use live availability below to answer whether a slot is open. State price only when pricing exists in business knowledge or conversation context; never invent price.",
      availabilityText.trim(),
      bookingPagesText.trim(),
      bookableResourcesText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    console.warn(
      "[auto-reply-pipeline] fast booking context failed",
      error instanceof Error ? error.message : "unknown",
    );
    return "";
  }
}

export async function resolveAssistantProfile(
  admin: MessagingDbClient,
  businessId: string,
) {
  const { data } = await admin
    .from("ai_assistant_profile")
    .select(
      "business_id, name, system_prompt, communication_style, language, fallback_reply_message, can_reply, can_create_task, can_create_deal, can_update_contact, can_add_note, can_add_internal_note, can_create_calendar_event, can_request_human, can_notify_owner, can_notify_on_actions, can_summarize_actions_in_chat, can_send_proactive_message, collection_niche, data_collection_fields",
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
      canAddNote: data.can_add_note ?? true,
      canAddInternalNote: data.can_add_internal_note ?? true,
      canCreateCalendarEvent: data.can_create_calendar_event ?? true,
      canRequestHuman: data.can_request_human ?? true,
      canNotifyOwner: data.can_notify_owner ?? true,
      canNotifyOnActions: data.can_notify_on_actions ?? true,
      canSummarizeActionsInChat: data.can_summarize_actions_in_chat ?? true,
      canSendProactiveMessage: data.can_send_proactive_message ?? true,
      collectionNiche: (isCollectionNiche(data.collection_niche)
        ? data.collection_niche
        : "generic") as CollectionNiche,
      dataCollectionFields: parseDataCollectionFields(
        data.data_collection_fields,
      ) as DataCollectionField[],
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
    can_add_note: defaults.canAddNote,
    can_add_internal_note: defaults.canAddInternalNote,
    can_create_calendar_event: defaults.canCreateCalendarEvent,
    can_request_human: defaults.canRequestHuman,
    can_notify_owner: defaults.canNotifyOwner,
    can_notify_on_actions: defaults.canNotifyOnActions,
    can_summarize_actions_in_chat: defaults.canSummarizeActionsInChat,
    collection_niche: defaults.collectionNiche,
    data_collection_fields: defaults.dataCollectionFields,
  });

  return { ...defaults, fallbackReplyMessage: null };
}

async function resolveConversationContactId(
  admin: MessagingDbClient,
  conversationId: string,
  businessId: string,
): Promise<string | null> {
  return getConversationRepository(admin).findContactId(
    conversationId,
    businessId,
  );
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
        "name, email, phone_number, pipeline_stage, deal_value, lead_score, ai_summary, expected_close_date, custom_fields",
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
    email: contact.email,
    phone: contact.phone_number,
    pipelineStage: contact.pipeline_stage,
    dealValue: contact.deal_value,
    leadScore: contact.lead_score,
    expectedCloseDate: contact.expected_close_date,
    aiSummary: contact.ai_summary,
    openTaskCount: openTaskCount ?? 0,
    customFields:
      contact.custom_fields && typeof contact.custom_fields === "object"
        ? (contact.custom_fields as Record<string, unknown>)
        : null,
  };
}

export function applyAgentPermissionsToPlan(
  plan: ExecutorPlan,
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>,
): ExecutorPlan {
  return filterExecutorPlanByProfile(plan, profile).plan;
}

function assembleAutoReplySystemPrompt(input: {
  baseSystemPrompt: string;
  conversationSummary: string | null;
  crmContext: string;
  bookingContext: string;
  knowledgeGuidance?: string;
  actionOutcomeContext?: string;
  collectionContext?: string;
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

  if (input.collectionContext?.trim()) {
    sections.push(input.collectionContext.trim());
  }

  if (input.knowledgeGuidance?.trim()) {
    sections.push(input.knowledgeGuidance.trim());
  }

  if (input.bookingContext.trim()) {
    sections.push(input.bookingContext.trim());
  }

  if (input.actionOutcomeContext?.trim()) {
    sections.push(input.actionOutcomeContext.trim());
  }

  return sections.join("\n\n");
}

function buildPrepFromProfile(input: {
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
  conversationSummary: string | null;
  crmContext: string;
  bookingContext: string;
  knowledgeGuidance?: string;
  actionOutcomeContext?: string;
  collectionContext?: string;
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
      bookingContext: input.bookingContext,
      knowledgeGuidance: input.knowledgeGuidance,
      actionOutcomeContext: input.actionOutcomeContext,
      collectionContext: input.collectionContext,
    }),
    provider: getPrimaryPlatformLlmProvider(),
    model: resolveLlmModel(getPrimaryPlatformLlmProvider(), undefined),
    language: input.profile.language,
  };
}

function resolveSafeAssistantFallbackReplyMessage(input: {
  language: string;
  clientMessage?: string | null;
  customMessage?: string | null;
}): string {
  const fallbackText = resolveAssistantFallbackReplyMessage(input);
  const safeFallback = sanitizeWorkerFacingReply(fallbackText, {
    fallback: null,
  });

  if (safeFallback.text) {
    return safeFallback.text;
  }

  const defaultFallback = resolveAssistantFallbackReplyMessage({
    language: input.language,
    clientMessage: input.clientMessage,
    customMessage: null,
  });
  const safeDefault = sanitizeWorkerFacingReply(defaultFallback, {
    fallback: null,
  });

  return (
    safeDefault.text ??
    "I can help with that right here. What exact detail should I handle next?"
  );
}

function looksLikePassiveWaitingReply(text: string): boolean {
  return [
    /checking availability/i,
    /checking the details/i,
    /being created now/i,
    /will (get back|follow up|respond|confirm later)/i,
    /biroz kuting/i,
    /проверяю[\s\S]{0,80}(доступ|брон|детал)/i,
    /ожидайте/i,
    /tekshir(yapman|aman)/i,
  ].some((pattern) => pattern.test(text));
}

function buildKnowledgeGuidance(knowledgeCount: number): string {
  if (knowledgeCount > 0) {
    return [
      "Business knowledge for this message is available in the knowledge context with citation labels (KB-…).",
      "Answer prices, services, hours, and policies only from those cited entries.",
      "Never invent prices or services that are not present there.",
    ].join(" ");
  }

  return [
    "No matching business knowledge was found for this message.",
    "Do not invent prices, services, or policies.",
    "Answer only from conversation context, or ask one short clarifying question about what they need.",
  ].join(" ");
}

function buildActionOutcomeContext(input: {
  actionsApplied: string[];
  clientSummary: string | null;
  language: string;
  agentName: string;
}): string {
  const confirmation =
    buildCustomerFacingActionSummary({
      agentName: input.agentName,
      language: input.language,
      actionsApplied: input.actionsApplied,
      clientSummary: input.clientSummary ?? undefined,
    }) ?? input.clientSummary;

  return [
    "Worker actions already completed for this customer turn:",
    input.actionsApplied.length > 0
      ? input.actionsApplied.join("; ")
      : "Orchestration completed with no CRM/calendar writes.",
    confirmation
      ? `Confirmed outcome to tell the customer:\n${confirmation}`
      : "If details are still missing, ask exactly one clear question. Do not say you are checking or waiting.",
    "Confirm the outcome clearly in your reply. Never say you are still checking, waiting, or that a manager will follow up.",
  ].join("\n");
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
    provider: getPrimaryPlatformLlmProvider(),
    model: resolveLlmModel(getPrimaryPlatformLlmProvider(), undefined),
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

  await ensurePlatformPromptsLoaded(input.admin);

  const historyLimit = resolveHistoryMessageLimit(subscriptionPlan);
  const contactId =
    input.conversationId != null
      ? await resolveConversationContactId(
          input.admin,
          input.conversationId,
          input.businessId,
        )
      : null;

  const [
    conversationHistory,
    knowledgeEntries,
    crmSnapshot,
    conversationMemory,
    bookingContext,
  ] = await Promise.all([
      input.conversationHistory ??
        (input.conversationId
          ? fetchConversationHistory(
              input.admin,
              input.conversationId,
              input.businessId,
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
        ? loadConversationMemory(
            input.admin,
            input.conversationId,
            input.businessId,
          )
        : Promise.resolve(null),
      buildFastBookingReplyContext({
        businessId: input.businessId,
        clientMessage: input.clientMessage,
      }),
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
  const knowledgeGuidance = buildKnowledgeGuidance(trimmedKnowledge.length);
  const collectionGaps = computeCollectionGaps({
    niche: profile.collectionNiche ?? "generic",
    storedFields: profile.dataCollectionFields ?? [],
    contact: crmSnapshot
      ? {
          name: crmSnapshot.name,
          email: crmSnapshot.email,
          phone: crmSnapshot.phone,
          dealValue: crmSnapshot.dealValue,
          expectedCloseDate: crmSnapshot.expectedCloseDate,
          customFields: crmSnapshot.customFields,
        }
      : null,
  });
  const collectionContext = formatCollectionGapsForPrompt(collectionGaps);
  const voice = buildPrepFromProfile({
    profile,
    conversationSummary: conversationMemory?.aiSummary ?? null,
    crmContext,
    bookingContext,
    knowledgeGuidance,
    collectionContext,
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
      bookingContext,
      knowledgeGuidance,
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

/** Reply first with the single AI Agent profile. Booking/order turns run CRM first. */
export async function generateFastAssistantReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  clientMessage: string;
  conversationId?: string | null;
  conversationHistory?: ConversationTurn[];
  requireAiEnabled?: boolean;
  /** Dry-run / suggest-reply: never write CRM/calendar before generating text. */
  skipWorkerActions?: boolean;
}): Promise<AutoReplyGenerationResult> {
  const prepared = await prepareAutoReplyContext(input);

  if (!prepared.success) {
    return prepared.failure;
  }

  const { prep } = prepared;

  if (!prep.profile.canReply) {
    return { success: false, reason: "ai_disabled" };
  }

  let orchestrationCompleted = false;
  let actionOutcomeContext = "";
  let preferredConfirmation: string | null = null;

  const shouldActBeforeReply =
    !input.skipWorkerActions &&
    Boolean(prep.conversationId) &&
    isLikelyBookingOrOrderMessage(prep.clientMessage) &&
    (prep.profile.canCreateCalendarEvent ||
      prep.profile.canCreateTask ||
      prep.profile.canCreateDeal);

  if (shouldActBeforeReply && prep.conversationId) {
    try {
      const cycle = await runAutoReplyBackgroundOrchestration({
        admin: prep.admin,
        businessId: prep.businessId,
        channel: prep.channel,
        conversationId: prep.conversationId,
        clientMessage: prep.clientMessage,
        language: prep.profile.language,
      });

      orchestrationCompleted = cycle.completed;

      if (cycle.actionsApplied.length > 0 || cycle.clientSummary) {
        preferredConfirmation = buildCustomerFacingActionSummary({
          agentName: prep.profile.name,
          language: prep.profile.language,
          actionsApplied: cycle.actionsApplied,
          clientSummary: cycle.clientSummary ?? undefined,
        });
        actionOutcomeContext = buildActionOutcomeContext({
          actionsApplied: cycle.actionsApplied,
          clientSummary: cycle.clientSummary,
          language: prep.profile.language,
          agentName: prep.profile.name,
        });
      }
    } catch (error) {
      console.warn(
        "[auto-reply-pipeline] inline worker actions failed; falling back to reply-first",
        error instanceof Error ? error.message : "unknown",
      );
      orchestrationCompleted = false;
    }
  }

  const voice = buildPrepFromProfile({
    profile: prep.profile,
    conversationSummary: prep.conversationSummary,
    crmContext: prep.crmContext,
    bookingContext: prep.bookingContext,
    knowledgeGuidance: prep.knowledgeGuidance,
    actionOutcomeContext,
  });

  const reply = await generateAssistantReplyWithFallback({
    businessId: prep.businessId,
    conversationId: prep.conversationId ?? undefined,
    callType: "auto_reply",
    systemPrompt: voice.systemPrompt,
    language: voice.language,
    userMessage: prep.clientMessage,
    knowledgeContext: mapKnowledgeForLlm(prep.knowledgeEntries),
    conversationHistory: prep.conversationHistory,
  });

  if (!reply.success) {
    console.warn(
      "[auto-reply-pipeline] LLM failed; sending fallback reply",
      JSON.stringify({
        businessId: prep.businessId,
        conversationId: prep.conversationId,
        channel: prep.channel,
        errorCode: reply.error?.code,
        errorMessage: reply.error?.message,
        attemptedProviders: reply.attemptedProviders,
      }),
    );

    const fallbackText =
      (preferredConfirmation &&
        sanitizeWorkerFacingReply(preferredConfirmation, { fallback: null })
          .text) ||
      resolveSafeAssistantFallbackReplyMessage({
        language: voice.language,
        clientMessage: prep.clientMessage,
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
      orchestrationCompleted,
    };
  }

  if (prep.conversationId) {
    void refreshConversationSummaryIfNeeded({
      admin: prep.admin,
      businessId: prep.businessId,
      conversationId: prep.conversationId,
    });
  }

  const fallbackText = resolveSafeAssistantFallbackReplyMessage({
    language: voice.language,
    clientMessage: prep.clientMessage,
    customMessage: prep.fallbackReplyMessage,
  });
  const safeReply = sanitizeWorkerFacingReply(reply.data.text, {
    fallback: fallbackText,
  });

  if (safeReply.rewritten) {
    console.warn(
      "[auto-reply-pipeline] blocked unsafe LLM reply",
      JSON.stringify({
        businessId: prep.businessId,
        conversationId: prep.conversationId,
        channel: prep.channel,
        reason: safeReply.reason,
      }),
    );
  }

  let finalText = safeReply.text ?? fallbackText;

  if (
    preferredConfirmation &&
    (safeReply.rewritten || looksLikePassiveWaitingReply(finalText))
  ) {
    const safeConfirmation = sanitizeWorkerFacingReply(preferredConfirmation, {
      fallback: null,
    });

    if (safeConfirmation.text) {
      finalText = safeConfirmation.text;
    }
  }

  void touchPlatformPromptUsage(
    ["assistant_system", "guard_fallback"],
    prep.admin,
  );

  return {
    success: true,
    text: finalText,
    matchedAgentId: null,
    matchedAgentName: prep.profile.name,
    provider: reply.usedProvider ?? voice.provider,
    model: reply.data.model,
    language: voice.language,
    isFallback: safeReply.rewritten && !preferredConfirmation,
    orchestrationCompleted,
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
}): Promise<{
  completed: boolean;
  actionsApplied: string[];
  clientSummary: string | null;
}> {
  if (!(await isPlatformFeatureAllowed(input.businessId, "ai"))) {
    return { completed: false, actionsApplied: [], clientSummary: null };
  }

  const subscriptionPlan = await fetchBusinessSubscriptionPlan(
    input.admin,
    input.businessId,
  );
  const historyLimit = resolveHistoryMessageLimit(subscriptionPlan);
  const profile = await resolveAssistantProfile(input.admin, input.businessId);

  await ensurePlatformPromptsLoaded(input.admin);

  const conversationHistory = await fetchConversationHistory(
    input.admin,
    input.conversationId,
    input.businessId,
    historyLimit,
  );

  const contactId = await resolveConversationContactId(
    input.admin,
    input.conversationId,
    input.businessId,
  );

  let contact =
    contactId != null
      ? await loadContactSnapshot(input.admin, input.businessId, contactId)
      : null;

  const calendarConnection = await input.admin
    .from("google_calendar_connections")
    .select("google_calendar_status")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const calendarConnected =
    calendarConnection.data?.google_calendar_status === "connected";

  const [bookingSetup, calendarResources, bookingPages, calendarBookingEnabled] =
    await Promise.all([
      getBusinessBookingSetup(input.businessId),
      listBusinessCalendarResources(input.businessId),
      listPublishedBookingPagesForBusinessAdmin(input.businessId),
      isCalendarBookingEnabled(input.businessId),
    ]);
  const bookableResourcesText = formatCalendarResourcesForAiPrompt(
    calendarResources,
    bookingSetup,
  );
  const bookingPagesText = formatBookingPagesForAiPrompt(bookingPages);
  const availabilityText = calendarBookingEnabled
    ? await formatAvailabilityForAiPrompt(input.businessId)
    : "";

  const orchestrationResult = await runAutoReplyOrchestrator({
    businessId: input.businessId,
    message: input.clientMessage,
    conversationHistory,
    contact,
    calendarBookingEnabled,
    googleCalendarConnected: calendarConnected,
    bookableResourcesText,
    bookingPagesText,
    availabilityText,
    collectionContext: formatCollectionGapsForPrompt(
      computeCollectionGaps({
        niche: profile.collectionNiche ?? "generic",
        storedFields: profile.dataCollectionFields ?? [],
        contact: contact
          ? {
              name: contact.name,
              email: contact.email,
              phone: contact.phoneNumber,
              company: contact.customFields.company,
              location: contact.customFields.location,
              dealValue: contact.dealValue,
              expectedCloseDate: contact.expectedCloseDate,
              collection: contact.customFields.collection,
              customFields: contact.customFields as unknown as Record<
                string,
                unknown
              >,
            }
          : null,
      }),
    ),
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
    return { completed: false, actionsApplied: [], clientSummary: null };
  }

  const orchestration = orchestrationResult.data;
  const rawPlan = orchestratorResponseToExecutorPlan(orchestration);
  const filteredPlan = filterExecutorPlanByProfile(rawPlan, profile);

  if (
    filteredPlan.blockedActions.length > 0 ||
    filteredPlan.contactUpdatesBlocked
  ) {
    console.info(
      "[auto-reply-pipeline]",
      JSON.stringify({
        action: "tools_blocked_by_permissions",
        blockedActions: filteredPlan.blockedActions,
        contactUpdatesBlocked: filteredPlan.contactUpdatesBlocked,
      }),
    );
  }

  const permittedPlan = filteredPlan.plan;

  let resolvedContactId = contactId;
  let contactCreationLabel: string | null = null;

  if (!resolvedContactId) {
    const createContactAction = permittedPlan.actions.find(
      (action) =>
        action.type === "create_contact" || action.type === "create_lead",
    );

    if (
      createContactAction &&
      (createContactAction.type === "create_contact" ||
        createContactAction.type === "create_lead")
    ) {
      const created = await applyCreateContactFromPlan({
        admin: input.admin,
        businessId: input.businessId,
        conversationId: input.conversationId,
        channel: input.channel,
        action: createContactAction,
        clientMessage: input.clientMessage,
      });

      if (created) {
        resolvedContactId = created.contactId;
        contactCreationLabel = created.label;
        contact = await loadContactSnapshot(
          input.admin,
          input.businessId,
          created.contactId,
        );
      }
    }
  }

  const executorPlan = {
    ...permittedPlan,
    actions: permittedPlan.actions.filter(
      (action) =>
        action.type !== "create_contact" && action.type !== "create_lead",
    ),
  };

  let executorResult: Awaited<ReturnType<typeof applyPreparedExecutorPlan>> | null =
    null;

  const collectionGapsForExec = computeCollectionGaps({
    niche: profile.collectionNiche ?? "generic",
    storedFields: profile.dataCollectionFields ?? [],
    contact: contact
      ? {
          name: contact.name,
          email: contact.email,
          phone: contact.phoneNumber,
          company: contact.customFields.company,
          location: contact.customFields.location,
          dealValue: contact.dealValue,
          expectedCloseDate: contact.expectedCloseDate,
          collection: contact.customFields.collection,
          customFields: contact.customFields as unknown as Record<
            string,
            unknown
          >,
        }
      : null,
  });

  if (resolvedContactId != null) {
    executorResult = await applyPreparedExecutorPlan({
      admin: input.admin,
      businessId: input.businessId,
      contactId: resolvedContactId,
      conversationId: input.conversationId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      agent: null,
      routingMethod: "none",
      plan: executorPlan,
      suppressRunLog: true,
      dataCollectionFields: collectionGapsForExec.fields,
      requiredComplete: collectionGapsForExec.requiredComplete,
    });

    if (contactCreationLabel && executorResult) {
      executorResult = {
        ...executorResult,
        actionsApplied: [contactCreationLabel, ...executorResult.actionsApplied],
      };
    }
  }

  const opsActions = buildAgentOpsActions({
    intent: orchestration.intent,
    rawPlan,
    filtered: filteredPlan,
    executed: executorResult?.actionsApplied,
    skipped: executorResult?.skippedDuplicates,
  });

  await logAgentOpsRun(input.admin, {
    businessId: input.businessId,
    conversationId: input.conversationId,
    contactId: resolvedContactId ?? contactId,
    channel: input.channel,
    clientMessage: input.clientMessage,
    routingMethod: "none",
    actions: opsActions,
    success: executorResult?.success !== false,
    errorMessage: executorResult?.errorMessage ?? null,
  });

  if (
    resolvedContactId &&
    (orchestration.intent === "sales" || orchestration.intent === "registration")
  ) {
    void processSalesAgentRules({
      admin: input.admin,
      businessId: input.businessId,
      contactId: resolvedContactId,
      message: input.clientMessage,
      conversationId: input.conversationId,
      channel: input.channel,
    }).catch((error) => {
      console.warn(
        "[auto-reply-pipeline]",
        JSON.stringify({
          action: "bant_post_step_failed",
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    });
  }

  const actionsApplied = executorResult?.actionsApplied ?? [];
  const clientSummary = executorResult?.clientSummary?.trim() || null;

  if (actionsApplied.length) {
    void touchPlatformPromptUsage(["executor"], input.admin);
    await reportAgentActions({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
      channel: input.channel,
      contactName: contact?.name,
      profile: {
        name: profile.name,
        language: profile.language,
        canAddInternalNote: profile.canAddInternalNote,
        canNotifyOnActions: profile.canNotifyOnActions,
        canNotifyOwner: profile.canNotifyOwner,
        canSummarizeActionsInChat: profile.canSummarizeActionsInChat,
      },
      actionsApplied,
      clientSummary: clientSummary ?? undefined,
      sendFollowUp: input.sendFollowUp,
    });
  }

  if (
    !profile.canRequestHuman ||
    !profile.canNotifyOwner
  ) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return { completed: true, actionsApplied, clientSummary };
  }

  const handoffPlan = resolveManagerHandoffPlan({
    orchestration,
    clientMessage: input.clientMessage,
    conversationHistory,
  });

  if (!handoffPlan.notifyManager) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return { completed: true, actionsApplied, clientSummary };
  }

  await createAiHumanRequest({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    contactId: resolvedContactId ?? contactId,
    contactName: contact?.name,
    reason: handoffPlan.reason,
    messagePreview: input.clientMessage,
  });

  if (!handoffPlan.tellCustomerConfirmed || !input.sendFollowUp) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return { completed: true, actionsApplied, clientSummary };
  }

  const followUpText = buildHumanHandoffFollowUpMessage(input.language);

  const recentAiMessage = await getMessageRepository(
    input.admin,
  ).findLatestAiMessage(input.conversationId, input.businessId);

  if (
    recentAiMessage?.content &&
    Date.now() - new Date(recentAiMessage.created_at).getTime() < 2 * 60 * 1000 &&
    messagesAreLikelyDuplicates(recentAiMessage.content, followUpText)
  ) {
    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return { completed: true, actionsApplied, clientSummary };
  }

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

  return { completed: true, actionsApplied, clientSummary };
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
  const channelEnabled = await ensureChannelAiSettingsRow(
    input.admin,
    input.businessId,
    input.channel,
  );

  if (!channelEnabled) {
    return false;
  }

  const { data: profile } = await input.admin
    .from("ai_assistant_profile")
    .select(
      "can_reply, schedule_enabled, schedule_timezone, schedule_slots",
    )
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (profile?.can_reply === false) {
    return false;
  }

  const scheduleSlots = agentScheduleSlotsSchema.safeParse(
    profile?.schedule_slots,
  ).success
    ? (profile?.schedule_slots as AgentScheduleSlot[])
    : [];

  return isAgentWithinSchedule({
    scheduleEnabled: profile?.schedule_enabled ?? false,
    timezone: profile?.schedule_timezone?.trim() || "UTC",
    slots: scheduleSlots,
  });
}
