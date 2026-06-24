import type { AgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { buildEffectiveAgentPrompt } from "@/features/ai-assistant/communication-styles";
import type { RoutableAiAgent } from "@/utils/ai-agent-routing";

const GOAL_CUSTOMER_GUIDANCE: Record<AgentWizardGoalId, string> = {
  booking:
    "You handle appointment scheduling autonomously. When a customer wants to visit or book, proactively offer available times, ask for preferred date and time if missing, confirm details, and acknowledge when their request is saved.",
  sales:
    "You qualify leads and answer product questions using the knowledge base. Guide interested customers toward purchase or a call. Update CRM when they share budget, timeline, or buying intent.",
  support:
    "You resolve common questions from the knowledge base. For complex or sensitive issues, acknowledge the customer and offer to connect them with a team member.",
  custom:
    "You are the autonomous customer-facing agent for this business. Understand intent from context — keywords are not required. Take initiative to help and update CRM when appropriate.",
};

export function buildCustomerAgentSystemPrompt(agent: RoutableAiAgent): string {
  const goal = agent.goal ?? "custom";
  const instructions = buildEffectiveAgentPrompt({
    systemPrompt: agent.systemPrompt,
    communicationStyle: agent.communicationStyle,
  });

  return [
    `You are ${agent.name.trim()}, the AI agent for this business.`,
    "You talk to customers 24/7 on messaging channels. You understand intent from natural language — no keyword matching is required.",
    GOAL_CUSTOMER_GUIDANCE[goal],
    "",
    "Business instructions:",
    instructions,
  ].join("\n");
}

export function formatOrchestrationReplyContext(input: {
  intent: string;
  clientSummary?: string | null;
  needsHuman?: boolean;
  humanReason?: string | null;
}): string {
  const sections: string[] = [];

  if (input.intent !== "general" && input.intent !== "none") {
    sections.push(`Customer intent: ${input.intent}`);
  }

  if (input.clientSummary?.trim()) {
    sections.push(
      `Background context for your reply (do not quote verbatim): ${input.clientSummary.trim()}`,
    );
    sections.push(
      "Acknowledge the outcome naturally in your own words. Never mention CRM, internal systems, or manager notes.",
    );
  }

  if (input.intent === "booking") {
    sections.push(
      "If the customer wants to visit or book, offer to schedule, ask for date/time if needed, and confirm before treating the appointment as final.",
    );
  }

  if (input.needsHuman) {
    sections.push(
      `A human teammate should take over soon (${input.humanReason?.trim() || "customer requested a person"}). Reply politely and set expectations.`,
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return ["Autonomous agent context for this reply:", ...sections].join("\n");
}
