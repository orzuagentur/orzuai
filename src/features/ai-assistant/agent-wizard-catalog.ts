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
    description: "Background BANT-style qualification, deals, and lead tasks in CRM.",
    benefit: "Auto-update CRM when customers ask about pricing or buying",
    icon: TargetIcon,
    iconId: "target",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Sales CRM agent",
      systemPrompt:
        "Background sales CRM agent. When customer messages imply purchase intent, plan CRM updates: lead score context, create deals, tasks, and notes. Do not write customer-facing chat text.",
      triggerKeywords: ["price", "buy", "demo", "cost", "budget", "interested"],
      enabled: false,
    },
  },
  {
    id: "support",
    label: "Customer support",
    description: "Background support tasks, notes, and escalation flags in CRM.",
    benefit: "Log support issues and tasks without changing chat voice",
    icon: HeadphonesIcon,
    iconId: "headphones",
    recommendedProvider: "gemini",
    draft: {
      name: "Support CRM agent",
      systemPrompt:
        "Background support CRM agent. Plan CRM tasks and notes for customer issues. Escalate to human when needed. Do not write customer-facing chat text.",
      triggerKeywords: ["help", "issue", "problem", "support", "how"],
      enabled: false,
    },
  },
  {
    id: "booking",
    label: "Booking & scheduling",
    description: "Background booking tasks and contact detail capture in CRM.",
    benefit: "Create booking tasks from appointment requests",
    icon: CalendarIcon,
    iconId: "calendar",
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    draft: {
      name: "Booking CRM agent",
      systemPrompt:
        "Background booking CRM agent. Plan tasks and contact updates when customers request appointments. Do not write customer-facing chat text.",
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
      name: "Custom CRM agent",
      systemPrompt:
        "Background CRM agent with custom routing rules. Plan CRM updates from customer messages. Do not write customer-facing chat text.",
      triggerKeywords: [],
      enabled: false,
    },
  },
];

export const AGENT_WIZARD_STEPS = [
  { id: 1, label: "CRM goal" },
  { id: 2, label: "Channels" },
  { id: 3, label: "Background AI" },
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
