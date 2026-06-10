import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  HeadphonesIcon,
  TargetIcon,
  WrenchIcon,
} from "lucide-react";

import type { AiProvider } from "@/lib/ai/constants";
import { getDefaultModelForProvider } from "@/lib/ai/constants";

import type { AgentIconId } from "./agent-icons";
import type { AiAgentTemplateDraft } from "./agent-templates";

export type AgentWizardGoalId = "sales" | "support" | "booking" | "custom";

export type AgentWizardGoal = {
  id: AgentWizardGoalId;
  label: string;
  description: string;
  benefit: string;
  icon: LucideIcon;
  iconId: AgentIconId;
  recommendedProvider: AiProvider;
  recommendedModel?: string;
  draft: AiAgentTemplateDraft;
};

export const AGENT_WIZARD_GOALS: AgentWizardGoal[] = [
  {
    id: "sales",
    label: "Sales & leads",
    description: "Qualify interest, answer product questions, and move deals forward.",
    benefit: "Turn every message into a qualified lead",
    icon: TargetIcon,
    iconId: "target",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Sales agent",
      systemPrompt:
        "You are a sales assistant. Qualify leads from each message, answer product questions using the knowledge base, and suggest booking a call when intent is high. Be helpful, not pushy.",
      triggerKeywords: ["price", "buy", "demo", "cost", "budget", "interested"],
      enabled: false,
    },
  },
  {
    id: "support",
    label: "Customer support",
    description: "Resolve FAQs from your knowledge base and escalate when needed.",
    benefit: "Answer common questions instantly, 24/7",
    icon: HeadphonesIcon,
    iconId: "headphones",
    recommendedProvider: "gemini",
    draft: {
      name: "Support agent",
      systemPrompt:
        "You are a customer support agent. Answer common questions from the knowledge base. If the issue needs a human, acknowledge it and ask for details.",
      triggerKeywords: ["help", "issue", "problem", "support", "how"],
      enabled: false,
    },
  },
  {
    id: "booking",
    label: "Booking & scheduling",
    description: "Collect date, time, and contact details for appointments.",
    benefit: "Capture bookings without back-and-forth",
    icon: CalendarIcon,
    iconId: "calendar",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Booking agent",
      systemPrompt:
        "You help customers schedule appointments. Collect preferred date, time, and contact details. Confirm availability politely and recap the booking clearly.",
      triggerKeywords: ["book", "appointment", "schedule", "reserve", "slot"],
      enabled: false,
    },
  },
  {
    id: "custom",
    label: "Custom agent",
    description: "Start from scratch with your own instructions and routing rules.",
    benefit: "Full control over behavior and channels",
    icon: WrenchIcon,
    iconId: "wrench",
    recommendedProvider: "gemini",
    draft: {
      name: "Custom agent",
      systemPrompt:
        "You are a helpful business assistant. Answer customer questions clearly and professionally using the knowledge base. Escalate to a human when the request is complex or sensitive.",
      triggerKeywords: [],
      enabled: false,
    },
  },
];

export const AGENT_WIZARD_STEPS = [
  { id: 1, label: "Goal" },
  { id: 2, label: "Channels" },
  { id: 3, label: "AI model" },
  { id: 4, label: "Review" },
] as const;

export function isAgentWizardGoalId(value: string): value is AgentWizardGoalId {
  return (AGENT_WIZARD_GOALS as readonly { id: string }[]).some(
    (goal) => goal.id === value,
  );
}

export function getAgentWizardGoal(
  goalId: string,
): AgentWizardGoal | undefined {
  return AGENT_WIZARD_GOALS.find((goal) => goal.id === goalId);
}

export function resolveGoalAiConfig(
  goal: AgentWizardGoal,
  availability: Record<AiProvider, boolean>,
): { provider: AiProvider; model: string } {
  if (availability[goal.recommendedProvider]) {
    return {
      provider: goal.recommendedProvider,
      model:
        goal.recommendedModel ??
        getDefaultModelForProvider(goal.recommendedProvider),
    };
  }

  const order: AiProvider[] = ["openai", "gemini", "claude"];

  for (const provider of order) {
    if (availability[provider]) {
      return {
        provider,
        model: getDefaultModelForProvider(provider),
      };
    }
  }

  return {
    provider: goal.recommendedProvider,
    model:
      goal.recommendedModel ??
      getDefaultModelForProvider(goal.recommendedProvider),
  };
}
