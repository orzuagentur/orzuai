"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import { IntegrationWizardNav } from "@/components/integrations/IntegrationWizardNav";
import {
  DashboardFill,
  DashboardPaneBody,
  DashboardPaneHeader,
} from "@/components/layout/DashboardWorkspaceLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <DashboardFill>
      <DashboardPaneHeader className="py-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
          <Link href={backHref}>
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </DashboardPaneHeader>

      <DashboardPaneHeader className="space-y-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {Icon ? (
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${getChannelIconContainerClassName(activeChannel)}`}
              >
                <Icon className="size-5" />
              </div>
            ) : null}
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                {channelConfig?.label ?? activeChannel}
              </h1>
              <p className="text-sm text-muted-foreground">
                {channelConfig?.description}
              </p>
              {entry.detail ? (
                <p className="text-sm font-medium text-foreground/80">
                  {entry.detail}
                </p>
              ) : null}
            </div>
          </div>
          <ChannelStatusBadge entry={entry} />
        </div>

        {isMessagingChannel ? (
          isActivated ? (
            <IntegrationSectionTabs
              activeChannel={activeChannel}
              activeSection={activeSection}
              isActivated={isActivated}
            />
          ) : (
            <div className="space-y-2">
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
          <IntegrationSectionTabs
            activeChannel={activeChannel}
            activeSection={activeSection}
            isActivated={isActivated}
          />
        )}
      </DashboardPaneHeader>

      <DashboardPaneBody className="bg-muted/10">
        <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
      </DashboardPaneBody>
    </DashboardFill>
  );
}

function IntegrationSectionTabs({
  activeChannel,
  activeSection,
  isActivated,
}: {
  activeChannel: IntegrationChannelId;
  activeSection: IntegrationSectionId;
  isActivated: boolean;
}) {
  return (
    <nav className="-mb-4 flex gap-1 overflow-x-auto border-b">
      {INTEGRATION_SECTION_LIST.map((section) => {
        const href = section.href(activeChannel);
        const isActive = activeSection === section.id;
        const label =
          section.id === "activate" && isActivated
            ? INTEGRATIONS_MESSAGES.sectionSettings
            : section.label;

        return (
          <Link
            key={section.id}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
