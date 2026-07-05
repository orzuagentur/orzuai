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
import { reportAgentActions } from "@/services/agent-action-reporting.service";
import { resolveAssistantFallbackReplyMessage } from "@/lib/ai/fallback-reply";
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
  const messageRepo = getMessageRepository(admin);
  const visibleMessages = [
    ...(await messageRepo.listForAiHistory(conversationId, limit)),
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
    title: entry.title,
    content: entry.content,
    category: entry.category ?? "",
  }));
}

export async function resolveAssistantProfile(
  admin: MessagingDbClient,
  businessId: string,
) {
  const { data } = await admin
    .from("ai_assistant_profile")
    .select(
      "business_id, name, system_prompt, communication_style, language, fallback_reply_message, can_reply, can_create_task, can_create_deal, can_update_contact, can_add_note, can_add_internal_note, can_create_calendar_event, can_request_human, can_notify_owner, can_notify_on_actions, can_summarize_actions_in_chat",
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
  });

  return { ...defaults, fallbackReplyMessage: null };
}

async function resolveConversationContactId(
  admin: MessagingDbClient,
  conversationId: string,
): Promise<string | null> {
  return getConversationRepository(admin).findContactId(conversationId);
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
    provider: getPrimaryPlatformLlmProvider(),
    model: resolveLlmModel(getPrimaryPlatformLlmProvider(), undefined),
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

  const fallbackText = resolveAssistantFallbackReplyMessage({
    language: voice.language,
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

  void touchPlatformPromptUsage(
    ["assistant_system", "guard_fallback"],
    prep.admin,
  );

  return {
    success: true,
    text: safeReply.text ?? fallbackText,
    matchedAgentId: null,
    matchedAgentName: prep.profile.name,
    provider: reply.usedProvider ?? voice.provider,
    model: reply.data.model,
    language: voice.language,
    isFallback: safeReply.rewritten,
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
  if (!(await isPlatformFeatureAllowed(input.businessId, "ai"))) {
    return;
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
    historyLimit,
  );

  const contactId = await resolveConversationContactId(
    input.admin,
    input.conversationId,
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
      (action) => action.type === "create_contact",
    );

    if (createContactAction?.type === "create_contact") {
      const created = await applyCreateContactFromPlan({
        admin: input.admin,
        businessId: input.businessId,
        conversationId: input.conversationId,
        channel: input.channel,
        action: createContactAction,
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
    actions: permittedPlan.actions.filter((action) => action.type !== "create_contact"),
  };

  let executorResult: Awaited<ReturnType<typeof applyPreparedExecutorPlan>> | null =
    null;

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

  if (executorResult?.actionsApplied.length) {
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
      actionsApplied: executorResult.actionsApplied,
      clientSummary: executorResult.clientSummary,
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
    return;
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
    return;
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
    return;
  }

  const followUpText = buildHumanHandoffFollowUpMessage(input.language);

  const recentAiMessage = await getMessageRepository(
    input.admin,
  ).findLatestAiMessage(input.conversationId);

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
    return;
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
