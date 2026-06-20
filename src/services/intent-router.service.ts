import "server-only";

import type { AgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { isAgentGoalId } from "@/lib/ai-assistant/infer-agent-goal";
import { generateText } from "@/services/llm.service";
import type { MessagingChannel } from "@/types/database.types";
import {
  intentClassificationSchema,
  type AgentRoutingMethod,
  type CustomerIntent,
  type IntentClassification,
} from "@/types/intent-router.types";
import {
  resolveAgentMatch,
  type RoutableAiAgent,
} from "@/utils/ai-agent-routing";

export const INTENT_ROUTER_CONFIDENCE_THRESHOLD = 0.65;

export type AgentRoutingResult = {
  agent: RoutableAiAgent | null;
  method: AgentRoutingMethod;
  classification: IntentClassification | null;
};

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export function mapIntentToAgentGoal(
  intent: CustomerIntent,
): AgentWizardGoalId | null {
  switch (intent) {
    case "sales":
      return "sales";
    case "booking":
      return "booking";
    case "support":
      return "support";
    case "registration":
      return "custom";
    case "general":
    case "none":
    default:
      return null;
  }
}

export function selectAgentByGoal(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
  goal: AgentWizardGoalId;
}): RoutableAiAgent | null {
  const eligible = input.agents
    .filter(
      (agent) =>
        agent.enabled &&
        agent.channels.includes(input.channel) &&
        agent.goal === input.goal,
    )
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return eligible[0] ?? null;
}

function parseIntentClassificationJson(
  text: string,
): IntentClassification | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(candidate);
    const validated = intentClassificationSchema.safeParse(parsed);

    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

function buildClassificationPrompt(input: {
  message: string;
  conversationHistory: ConversationTurn[];
}): string {
  const historySection =
    input.conversationHistory.length > 0
      ? input.conversationHistory
          .slice(-6)
          .map(
            (turn) =>
              `${turn.role === "user" ? "Customer" : "Assistant"}: ${turn.content}`,
          )
          .join("\n")
      : "No prior messages.";

  return [
    "Classify the customer's latest message for routing to a specialized agent.",
    "",
    "Recent conversation:",
    historySection,
    "",
    "Latest customer message:",
    input.message,
    "",
    "Return JSON only:",
    '{"intent":"general|booking|sales|support|registration|none","confidence":0.0}',
    "",
    "Intent guide:",
    "- general: greetings, small talk, unclear intent",
    "- booking: schedule, appointment, reservation, visit time",
    "- sales: pricing, purchase, demo, product interest",
    "- support: help, issue, complaint, how-to",
    "- registration: sign up, enroll, create account, onboarding",
    "- none: spam or not actionable",
  ].join("\n");
}

export async function classifyCustomerIntent(input: {
  businessId: string;
  message: string;
  conversationHistory?: ConversationTurn[];
}): Promise<IntentClassification | null> {
  const conversationHistory = input.conversationHistory ?? [];

  const result = await generateText({
    businessId: input.businessId,
    provider: "gemini",
    skipUsageLog: true,
    skipUsageLimit: true,
    systemInstruction:
      "You classify customer messages for business automation. Reply with valid JSON only. confidence is 0 to 1.",
    prompt: buildClassificationPrompt({
      message: input.message,
      conversationHistory,
    }),
  });

  if (!result.success) {
    return null;
  }

  return parseIntentClassificationJson(result.data.text);
}

function logRoutingDecision(input: {
  channel: MessagingChannel;
  message: string;
  result: AgentRoutingResult;
}): void {
  console.info(
    "[intent-router]",
    JSON.stringify({
      channel: input.channel,
      messagePreview: input.message.slice(0, 120),
      method: input.result.method,
      intent: input.result.classification?.intent ?? null,
      confidence: input.result.classification?.confidence ?? null,
      agentId: input.result.agent?.id ?? null,
      agentName: input.result.agent?.name ?? null,
      agentGoal: input.result.agent?.goal ?? null,
    }),
  );
}

export function resolveAgentRoutingFromClassification(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
  message: string;
  classification: IntentClassification | null;
  extraAgents?: RoutableAiAgent[];
  logDecision?: boolean;
}): AgentRoutingResult {
  const agents = [...input.agents, ...(input.extraAgents ?? [])];
  const classification = input.classification;

  if (classification) {
    const goal = mapIntentToAgentGoal(classification.intent);

    if (
      goal &&
      classification.confidence >= INTENT_ROUTER_CONFIDENCE_THRESHOLD
    ) {
      const intentAgent = selectAgentByGoal({
        agents,
        channel: input.channel,
        goal,
      });

      if (intentAgent) {
        const result: AgentRoutingResult = {
          agent: intentAgent,
          method: "intent",
          classification,
        };

        if (input.logDecision !== false) {
          logRoutingDecision({
            channel: input.channel,
            message: input.message,
            result,
          });
        }

        return result;
      }
    }
  }

  const keywordAgent = resolveAgentMatch({
    agents,
    channel: input.channel,
    message: input.message,
  });

  const result: AgentRoutingResult = keywordAgent
    ? {
        agent: keywordAgent,
        method: "keyword",
        classification,
      }
    : {
        agent: null,
        method: "none",
        classification,
      };

  if (input.logDecision !== false) {
    logRoutingDecision({
      channel: input.channel,
      message: input.message,
      result,
    });
  }

  return result;
}

export async function resolveAgentRouting(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
  message: string;
  businessId: string;
  conversationHistory?: ConversationTurn[];
  extraAgents?: RoutableAiAgent[];
  logDecision?: boolean;
}): Promise<AgentRoutingResult> {
  const conversationHistory = input.conversationHistory ?? [];

  const classification = await classifyCustomerIntent({
    businessId: input.businessId,
    message: input.message,
    conversationHistory,
  });

  return resolveAgentRoutingFromClassification({
    agents: input.agents,
    channel: input.channel,
    message: input.message,
    classification,
    extraAgents: input.extraAgents,
    logDecision: input.logDecision,
  });
}

export function mapAgentRowToRoutable(row: {
  id: string;
  name: string;
  system_prompt: string;
  channels: MessagingChannel[] | null;
  trigger_keywords: string[] | null;
  enabled: boolean;
  goal?: string | null;
  provider?: string | null;
  model?: string | null;
  use_custom_model?: boolean | null;
  language?: string | null;
  communication_style?: string | null;
  updated_at?: string | null;
}): RoutableAiAgent {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    channels: row.channels ?? [],
    triggerKeywords: row.trigger_keywords ?? [],
    enabled: row.enabled,
    goal: row.goal && isAgentGoalId(row.goal) ? row.goal : "custom",
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    useCustomModel: row.use_custom_model ?? undefined,
    language: row.language ?? undefined,
    communicationStyle: row.communication_style ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}
