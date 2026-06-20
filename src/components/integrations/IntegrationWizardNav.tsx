import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  buildIntegrationAiSettingsHref,
  INTEGRATION_WIZARD_STEPS,
  isChannelConnectedForWorkspace,
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
  type IntegrationChannelStatusMap,
  type IntegrationWizardStepId,
} from "@/features/integrations";

type IntegrationWizardNavProps = {
  channel: IntegrationChannelId;
  activeStep: IntegrationWizardStepId;
  channelStatuses: IntegrationChannelStatusMap;
};

function getStepHref(
  channel: IntegrationChannelId,
  stepId: IntegrationWizardStepId,
): string {
  if (stepId === "connect") {
    return `${DASHBOARD_ROUTES.integrations}/${channel}?section=activate`;
  }

  if (!isMessagingIntegrationChannel(channel)) {
    return `${DASHBOARD_ROUTES.integrations}/${channel}?section=activate`;
  }

  if (stepId === "configure-ai") {
    return buildIntegrationAiSettingsHref(channel);
  }

  if (stepId === "test") {
    return buildIntegrationAiSettingsHref(channel);
  }

  return `${DASHBOARD_ROUTES.chats}/${channel}`;
}

export function IntegrationWizardNav({
  channel,
  activeStep,
  channelStatuses,
}: IntegrationWizardNavProps) {
  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);
  const activeIndex = INTEGRATION_WIZARD_STEPS.findIndex(
    (step) => step.id === activeStep,
  );

  return (
    <nav aria-label="Integration setup" className="mt-4 space-y-3">
      <ol className="flex flex-wrap items-center gap-2">
        {INTEGRATION_WIZARD_STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = index < activeIndex;
          const isDisabled = step.id !== "connect" && !isConnected;

          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 ? (
                <span className="text-xs text-muted-foreground">→</span>
              ) : null}
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                asChild={!isDisabled}
                disabled={isDisabled}
                className={cn(isComplete && !isActive && "text-primary")}
              >
                {isDisabled ? (
                  <span>
                    {index + 1}. {step.label}
                  </span>
                ) : (
                  <Link href={getStepHref(channel, step.id)}>
                    {index + 1}. {step.label}
                  </Link>
                )}
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
