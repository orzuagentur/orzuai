import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ONBOARDING_MESSAGES } from "@/features/onboarding/constants";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";
import type { OnboardingProgress } from "@/services/onboarding.service";

export type SetupStepItem = {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
  href: string;
};

export function buildSetupSteps(progress: OnboardingProgress): SetupStepItem[] {
  return [
    {
      id: "business",
      label: "Create business profile",
      done: progress.hasBusiness,
      required: true,
      href: DASHBOARD_ROUTES.onboarding,
    },
    {
      id: "channel",
      label: "Connect a messaging channel",
      done: progress.hasConnectedChannel,
      required: true,
      href: `${DASHBOARD_ROUTES.onboarding}?step=2`,
    },
    {
      id: "ai",
      label: "Enable AI Assistant",
      done: progress.hasAiEnabled,
      required: true,
      href: progress.connectedChannel
        ? buildAiAssistantHref({
            section: "assistant",
            channel: progress.connectedChannel,
          })
        : `${DASHBOARD_ROUTES.onboarding}?step=3`,
    },
    {
      id: "knowledge",
      label: "Add knowledge (optional)",
      done: progress.hasKnowledgeEntry,
      required: false,
      href: DASHBOARD_ROUTES.knowledgeBase,
    },
  ];
}

export function getRequiredSetupSteps(steps: SetupStepItem[]): SetupStepItem[] {
  return steps.filter((step) => step.required);
}

export function getSetupProgressLabel(): {
  title: string;
  description: string;
} {
  return {
    title: ONBOARDING_MESSAGES.checklistTitle,
    description: ONBOARDING_MESSAGES.checklistDescription,
  };
}
