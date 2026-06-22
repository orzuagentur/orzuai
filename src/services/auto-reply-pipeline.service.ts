import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAssistantSystemPrompt } from "@/lib/ai-assistant/build-assistant-system-prompt";
import {
  buildCustomerAgentSystemPrompt,
  formatOrchestrationReplyContext,
} from "@/lib/ai-assistant/build-agent-system-prompt";
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
import {
  mapAgentRowToRoutable,
  mapIntentToAgentGoal,
  resolveAgentRoutingFromClassification,
} from "@/services/intent-router.service";
import {
  resolveAgentLanguage,
  resolveAgentLlmConfig,
  selectDefaultChannelAgent,
} from "@/services/customer-agent-resolver.service";
import type { OrchestratorResponse } from "@/types/ai-orchestrator.types";
import type { RoutableAiAgent } from "@/utils/ai-agent-routing";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import type { AgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { isAgentGoalId } from "@/lib/ai-assistant/infer-agent-goal";
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
  /** Orchestrator + CRM already ran inline — skip background job. */
  orchestrationHandled?: boolean;
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
  agents: RoutableAiAgent[];
  activeAgent: RoutableAiAgent | null;
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
      "business_id, name, system_prompt, communication_style, language, fallback_reply_message",
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
    };
  }

  const defaults = getDefaultAiAssistantProfile(businessId);
  await admin.from("ai_assistant_profile").insert({
    business_id: businessId,
    name: defaults.name,
    system_prompt: defaults.systemPrompt,
    communication_style: defaults.communicationStyle,
    language: defaults.language,
  });

  return { ...defaults, fallbackReplyMessage: null };
}

async function fetchRoutableAgents(
  admin: MessagingDbClient,
  businessId: string,
) {
  const { data } = await admin
    .from("ai_agents")
    .select(
      "id, name, system_prompt, channels, trigger_keywords, enabled, goal, provider, model, use_custom_model, language, communication_style, updated_at",
    )
    .eq("business_id", businessId);

  return (data ?? []).map(mapAgentRowToRoutable);
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

function resolveAgentGoal(
  agent: Awaited<ReturnType<typeof fetchRoutableAgents>>[number] | null,
): AgentWizardGoalId | null {
  if (!agent?.goal || !isAgentGoalId(agent.goal)) {
    return null;
  }

  return agent.goal;
}

function assembleAutoReplySystemPrompt(input: {
  baseSystemPrompt: string;
  conversationSummary: string | null;
  crmContext: string;
  orchestrationContext?: string | null;
}): string {
  const sections = [input.baseSystemPrompt];
  const summarySection = formatConversationSummaryForSystemPrompt(
    input.conversationSummary,
  );
  const crmSection = formatCrmContextForSystemPrompt(input.crmContext);
  const orchestrationSection = input.orchestrationContext?.trim() ?? "";

  if (summarySection) {
    sections.push(summarySection);
  }

  if (crmSection) {
    sections.push(crmSection);
  }

  if (orchestrationSection) {
    sections.push(orchestrationSection);
  }

  return sections.join("\n\n");
}

function buildVoiceSystemPrompt(input: {
  agent: RoutableAiAgent | null;
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
}): string {
  if (input.agent) {
    return buildCustomerAgentSystemPrompt(input.agent);
  }

  return buildAssistantSystemPrompt(input.profile);
}

function buildPrepFromAgent(input: {
  agent: RoutableAiAgent | null;
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
  conversationSummary: string | null;
  crmContext: string;
  orchestrationContext?: string | null;
}): {
  systemPrompt: string;
  provider: AiProvider;
  model: string;
  language: string;
} {
  const llm = resolveAgentLlmConfig(input.agent);
  const language = resolveAgentLanguage(
    input.agent,
    input.profile.language,
  );

  return {
    systemPrompt: assembleAutoReplySystemPrompt({
      baseSystemPrompt: buildVoiceSystemPrompt({
        agent: input.agent,
        profile: input.profile,
      }),
      conversationSummary: input.conversationSummary,
      crmContext: input.crmContext,
      orchestrationContext: input.orchestrationContext,
    }),
    provider: llm.provider,
    model: llm.model,
    language,
  };
}

async function runInlineOrchestration(input: {
  admin: MessagingDbClient;
  prep: AutoReplyPrep;
}): Promise<{
  orchestration: OrchestratorResponse | null;
  activeAgent: RoutableAiAgent | null;
  orchestrationHandled: boolean;
}> {
  if (!input.prep.conversationId) {
    return {
      orchestration: null,
      activeAgent: input.prep.activeAgent,
      orchestrationHandled: false,
    };
  }

  const contact =
    input.prep.contactId != null
      ? await loadContactSnapshot(
          input.prep.admin,
          input.prep.businessId,
          input.prep.contactId,
        )
      : null;

  const orchestrationResult = await runAutoReplyOrchestrator({
    businessId: input.prep.businessId,
    message: input.prep.clientMessage,
    conversationHistory: input.prep.conversationHistory,
    contact,
  });

  if (!orchestrationResult.success) {
    await logOrchestratorAgentRun(input.prep.admin, {
      businessId: input.prep.businessId,
      conversationId: input.prep.conversationId,
      contactId: input.prep.contactId,
      channel: input.prep.channel,
      clientMessage: input.prep.clientMessage,
      success: false,
      errorMessage: `[${orchestrationResult.errorCode}] ${orchestrationResult.errorMessage}`,
    });

    return {
      orchestration: null,
      activeAgent: input.prep.activeAgent,
      orchestrationHandled: false,
    };
  }

  const orchestration = orchestrationResult.data;

  const routing = resolveAgentRoutingFromClassification({
    agents: input.prep.agents,
    channel: input.prep.channel,
    message: input.prep.clientMessage,
    classification: {
      intent: orchestration.intent,
      confidence: orchestration.confidence,
    },
  });

  const activeAgent = routing.agent ?? input.prep.activeAgent;
  const agentGoal =
    resolveAgentGoal(routing.agent) ?? mapIntentToAgentGoal(orchestration.intent);

  if (input.prep.contactId != null) {
    await applyPreparedExecutorPlan({
      admin: input.prep.admin,
      businessId: input.prep.businessId,
      contactId: input.prep.contactId,
      conversationId: input.prep.conversationId,
      channel: input.prep.channel,
      clientMessage: input.prep.clientMessage,
      agent: routing.agent,
      goal: agentGoal,
      routingMethod: routing.method,
      plan: orchestratorResponseToExecutorPlan(orchestration),
    });
  }

  if (orchestration.needsHuman) {
    const humanReason =
      orchestration.humanReason?.trim() || "Customer needs a real person";

    await createAiHumanRequest({
      admin: input.prep.admin,
      businessId: input.prep.businessId,
      conversationId: input.prep.conversationId,
      channel: input.prep.channel,
      contactId: input.prep.contactId,
      contactName: contact?.name,
      reason: humanReason,
      messagePreview: input.prep.clientMessage,
    });
  }

  return {
    orchestration,
    activeAgent,
    orchestrationHandled: true,
  };
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

  const { data: aiSettings } = await input.admin
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", input.businessId)
    .eq("channel", input.channel)
    .maybeSingle();

  if (!aiSettings) {
    return {
      success: false,
      failure: { success: false, reason: "settings_missing" },
    };
  }

  if (requireAiEnabled && !aiSettings.ai_enabled) {
    return {
      success: false,
      failure: { success: false, reason: "ai_disabled" },
    };
  }

  const [profile, subscriptionPlan, agents] = await Promise.all([
    resolveAssistantProfile(input.admin, input.businessId),
    fetchBusinessSubscriptionPlan(input.admin, input.businessId),
    fetchRoutableAgents(input.admin, input.businessId),
  ]);

  const activeAgent = selectDefaultChannelAgent({
    agents,
    channel: input.channel,
  });

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
  const voice = buildPrepFromAgent({
    agent: activeAgent,
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
      agents,
      activeAgent,
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

/** Agent-first auto-reply: orchestration + CRM before customer-facing text. */
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

  const inline = await runInlineOrchestration({ admin: prep.admin, prep });

  const orchestrationContext = inline.orchestration
    ? formatOrchestrationReplyContext({
        intent: inline.orchestration.intent,
        clientSummary: inline.orchestration.clientSummary,
        needsHuman: inline.orchestration.needsHuman,
        humanReason: inline.orchestration.humanReason,
      })
    : null;

  const voice = buildPrepFromAgent({
    agent: inline.activeAgent,
    profile: prep.profile,
    conversationSummary: prep.conversationSummary,
    crmContext: prep.crmContext,
    orchestrationContext,
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
      matchedAgentId: inline.activeAgent?.id ?? null,
      matchedAgentName: inline.activeAgent?.name ?? null,
      provider: voice.provider,
      model: voice.model,
      isFallback: true,
      orchestrationHandled: inline.orchestrationHandled,
    };
  }

  if (inline.orchestrationHandled && prep.conversationId) {
    void refreshConversationSummaryIfNeeded({
      admin: prep.admin,
      businessId: prep.businessId,
      conversationId: prep.conversationId,
    });
  }

  return {
    success: true,
    text: reply.data.text,
    matchedAgentId: inline.activeAgent?.id ?? null,
    matchedAgentName: inline.activeAgent?.name ?? null,
    provider: reply.usedProvider ?? voice.provider,
    model: reply.data.model,
    orchestrationHandled: inline.orchestrationHandled,
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

  const conversationHistory = await fetchConversationHistory(
    input.admin,
    input.conversationId,
    historyLimit,
  );

  const agents = await fetchRoutableAgents(input.admin, input.businessId);

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

    resolveAgentRoutingFromClassification({
      agents,
      channel: input.channel,
      message: input.clientMessage,
      classification: null,
    });

    void refreshConversationSummaryIfNeeded({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
    });
    return;
  }

  const orchestration = orchestrationResult.data;

  const routing = resolveAgentRoutingFromClassification({
    agents,
    channel: input.channel,
    message: input.clientMessage,
    classification: {
      intent: orchestration.intent,
      confidence: orchestration.confidence,
    },
  });

  const agentGoal =
    resolveAgentGoal(routing.agent) ??
    mapIntentToAgentGoal(orchestration.intent);

  if (contactId != null) {
    await applyPreparedExecutorPlan({
      admin: input.admin,
      businessId: input.businessId,
      contactId,
      conversationId: input.conversationId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      agent: routing.agent,
      goal: agentGoal,
      routingMethod: routing.method,
      plan: orchestratorResponseToExecutorPlan(orchestration),
    });
  }

  if (!orchestration.needsHuman) {
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
  const { data } = await input.admin
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", input.businessId)
    .eq("channel", input.channel)
    .maybeSingle();

  return Boolean(data?.ai_enabled);
}
