import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getDefaultGeminiModel } from "@/lib/env";
import { buildAssistantSystemPrompt } from "@/lib/ai-assistant/build-assistant-system-prompt";
import { runAutoReplyOrchestrator } from "@/services/ai-orchestrator.service";
import {
  buildHumanHandoffFollowUpMessage,
  createAiHumanRequest,
} from "@/services/ai-human-request.service";
import {
  applyPreparedExecutorPlan,
  loadContactSnapshot,
} from "@/services/agent-task-executor.service";
import { generateAssistantReply } from "@/services/llm.service";
import { getDefaultAiAssistantProfile } from "@/services/ai-assistant-profile.service";
import {
  mapAgentRowToRoutable,
  mapIntentToAgentGoal,
  resolveAgentRoutingFromClassification,
} from "@/services/intent-router.service";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import type { AgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { isAgentGoalId } from "@/lib/ai-assistant/infer-agent-goal";
import { retrieveKnowledgeForMessage } from "@/services/knowledge-retrieval.service";
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
  provider: "gemini";
  model: string;
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
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
  systemPrompt: string;
  provider: "gemini";
  model: string;
  language: string;
  knowledgeEntries: Awaited<ReturnType<typeof retrieveKnowledgeForMessage>>;
};

async function fetchConversationHistory(
  admin: MessagingDbClient,
  conversationId: string,
  limit = 20,
): Promise<ConversationTurn[]> {
  const { data } = await admin
    .from("messages")
    .select("sender_type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (
    data?.map((message) => ({
      role: message.sender_type === "client" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })) ?? []
  );
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
    .select("business_id, name, system_prompt, communication_style, language")
    .eq("business_id", businessId)
    .maybeSingle();

  if (data) {
    return {
      businessId: data.business_id,
      name: data.name,
      systemPrompt: data.system_prompt,
      communicationStyle: data.communication_style,
      language: data.language,
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

  return defaults;
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

function resolveAgentGoal(
  agent: Awaited<ReturnType<typeof fetchRoutableAgents>>[number] | null,
): AgentWizardGoalId | null {
  if (!agent?.goal || !isAgentGoalId(agent.goal)) {
    return null;
  }

  return agent.goal;
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

  const profile = await resolveAssistantProfile(input.admin, input.businessId);
  const systemPrompt = buildAssistantSystemPrompt(profile);
  const provider = "gemini" as const;
  const model = getDefaultGeminiModel();
  const language = profile.language;

  const conversationHistory =
    input.conversationHistory ??
    (input.conversationId
      ? await fetchConversationHistory(input.admin, input.conversationId)
      : []);

  const knowledgeEntries = await retrieveKnowledgeForMessage({
    admin: input.admin,
    businessId: input.businessId,
    query: input.clientMessage,
  });

  return {
    success: true,
    prep: {
      admin: input.admin,
      businessId: input.businessId,
      channel: input.channel,
      clientMessage: input.clientMessage,
      conversationId: input.conversationId,
      conversationHistory,
      profile,
      systemPrompt,
      provider,
      model,
      language,
      knowledgeEntries,
    },
  };
}

/** Fast path: one Gemini call, reply text only — no CRM/orchestrator wait. */
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

  const reply = await generateAssistantReply({
    businessId: prep.businessId,
    conversationId: prep.conversationId ?? undefined,
    provider: prep.provider,
    model: prep.model,
    systemPrompt: prep.systemPrompt,
    language: prep.language,
    userMessage: prep.clientMessage,
    knowledgeContext: mapKnowledgeForLlm(prep.knowledgeEntries),
    conversationHistory: prep.conversationHistory,
  });

  if (!reply.success) {
    return {
      success: false,
      reason: "llm_failed",
      message: reply.error.message,
    };
  }

  return {
    success: true,
    text: reply.data.text,
    matchedAgentId: null,
    matchedAgentName: null,
    provider: prep.provider,
    model: prep.model,
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
  const conversationHistory = await fetchConversationHistory(
    input.admin,
    input.conversationId,
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

  const orchestration = await runAutoReplyOrchestrator({
    businessId: input.businessId,
    message: input.clientMessage,
    conversationHistory,
    contact,
  });

  if (!orchestration) {
    resolveAgentRoutingFromClassification({
      agents,
      channel: input.channel,
      message: input.clientMessage,
      classification: null,
    });
    return;
  }

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
