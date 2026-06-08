"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import { IntegrationWizardNav } from "@/components/integrations/IntegrationWizardNav";
import { Button } from "@/components/ui/button";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import {
  INTEGRATION_CHANNEL_LIST,
  INTEGRATION_SECTION_LIST,
  INTEGRATIONS_MESSAGES,
  isIntegrationSectionId,
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
  type IntegrationChannelStatusEntry,
  type IntegrationChannelStatusMap,
  type IntegrationSectionId,
  type IntegrationWizardStepId,
} from "@/features/integrations";

type IntegrationChannelShellProps = {
  activeChannel: IntegrationChannelId;
  channelStatuses: IntegrationChannelStatusMap;
  backHref: string;
  backLabel: string;
  isActivated: boolean;
  children: React.ReactNode;
};

export function IntegrationChannelShell({
  activeChannel,
  channelStatuses,
  backHref,
  backLabel,
  isActivated,
  children,
}: IntegrationChannelShellProps) {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection: IntegrationSectionId = isIntegrationSectionId(sectionParam)
    ? sectionParam
    : "activate";

  const channelConfig = INTEGRATION_CHANNEL_LIST.find((c) => c.id === activeChannel);
  const isMessagingChannel = isMessagingIntegrationChannel(activeChannel);
  const wizardStep: IntegrationWizardStepId =
    activeSection === "contacts" ? "go-live" : "connect";

  const entry: IntegrationChannelStatusEntry =
    channelStatuses[activeChannel] ??
    (channelConfig?.available
      ? { status: "disconnected" }
      : { status: "coming_soon" });

  const Icon = channelConfig?.icon;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div>
        <header className="border-b pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {Icon ? (
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${getChannelIconContainerClassName(activeChannel)}`}
                >
                  <Icon className="size-6" />
                </div>
              ) : null}
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">
                  {channelConfig?.label ?? activeChannel}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {channelConfig?.description}
                </p>
                {entry.detail ? (
                  <p className="text-sm font-medium">{entry.detail}</p>
                ) : null}
              </div>
            </div>
            <ChannelStatusBadge entry={entry} />
          </div>

          {isMessagingChannel ? (
            isActivated ? (
              <nav className="mt-4 flex flex-wrap gap-1">
                {INTEGRATION_SECTION_LIST.map((section) => {
                  const href = section.href(activeChannel);
                  const label =
                    section.id === "activate"
                      ? INTEGRATIONS_MESSAGES.sectionSettings
                      : section.label;

                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "secondary" : "ghost"}
                      size="sm"
                      asChild
                    >
                      <Link href={href}>{label}</Link>
                    </Button>
                  );
                })}
              </nav>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {INTEGRATIONS_MESSAGES.wizardTitle}
                </p>
                <IntegrationWizardNav
                  channel={activeChannel}
                  activeStep={wizardStep}
                  channelStatuses={channelStatuses}
                />
              </div>
            )
          ) : (
            <nav className="mt-4 flex flex-wrap gap-1">
              {INTEGRATION_SECTION_LIST.map((section) => {
                const href = section.href(activeChannel);
                const label =
                  section.id === "activate" && isActivated
                    ? INTEGRATIONS_MESSAGES.sectionSettings
                    : section.label;

                return (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                );
              })}
            </nav>
          )}
        </header>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}
