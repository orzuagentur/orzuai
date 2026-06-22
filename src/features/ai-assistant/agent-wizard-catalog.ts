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
    description: "Qualify leads, answer pricing questions, and move deals in CRM.",
    benefit: "Autonomous sales conversations without keyword triggers",
    icon: TargetIcon,
    iconId: "target",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Sales agent",
      systemPrompt:
        "You are a sales agent. Qualify leads from natural conversation, answer product questions using the knowledge base, and create deals or tasks in CRM when customers show buying intent.",
      triggerKeywords: [],
      enabled: true,
    },
  },
  {
    id: "support",
    label: "Customer support",
    description: "Answer FAQs and escalate complex issues to your team.",
    benefit: "24/7 support that logs issues in CRM automatically",
    icon: HeadphonesIcon,
    iconId: "headphones",
    recommendedProvider: "gemini",
    draft: {
      name: "Support agent",
      systemPrompt:
        "You are a customer support agent. Answer common questions from the knowledge base. For complex issues, acknowledge the customer and offer to connect them with a team member.",
      triggerKeywords: [],
      enabled: true,
    },
  },
  {
    id: "booking",
    label: "Booking & scheduling",
    description: "Understand visit requests and schedule appointments in chat.",
    benefit: "Customers say they want to visit — agent offers times and books",
    icon: CalendarIcon,
    iconId: "calendar",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Booking agent",
      systemPrompt:
        "You help customers schedule appointments at the business. When they want to visit, offer available times, ask for preferred date and time, confirm details, and save booking requests in CRM.",
      triggerKeywords: [],
      enabled: true,
    },
  },
  {
    id: "custom",
    label: "Custom agent",
    description: "Start from scratch with your own instructions.",
    benefit: "Full control over voice, channels, and behavior",
    icon: WrenchIcon,
    iconId: "wrench",
    recommendedProvider: "gemini",
    draft: {
      name: "Custom agent",
      systemPrompt:
        "You are a helpful business agent. Answer customer questions clearly using the knowledge base. Understand intent from context and update CRM when appropriate.",
      triggerKeywords: [],
      enabled: true,
    },
  },
];

export const AGENT_WIZARD_STEPS = [
  { id: 1, label: "Goal" },
  { id: 2, label: "Channels" },
  { id: 3, label: "AI model" },
  { id: 4, label: "Test" },
  { id: 5, label: "Review" },
] as const;

export type AgentWizardStepId = (typeof AGENT_WIZARD_STEPS)[number]["id"];

const WIZARD_TEST_STARTERS: Record<AgentWizardGoalId, string[]> = {
  booking: [
    "Hi, I want to book an appointment",
    "What times are available tomorrow?",
    "Can I visit this weekend?",
  ],
  sales: [
    "How much does your service cost?",
    "I'm interested — can you tell me more?",
    "Do you offer a free consultation?",
  ],
  support: [
    "Hi, I need help with my order",
    "What are your opening hours?",
    "I have a question about delivery",
  ],
  custom: [
    "Hello!",
    "Can you help me?",
    "I have a question about your business",
  ],
};

export function getAgentWizardTestStarters(
  goalId: AgentWizardGoalId,
): string[] {
  return WIZARD_TEST_STARTERS[goalId];
}

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
