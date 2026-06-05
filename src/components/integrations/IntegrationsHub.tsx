"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  INTEGRATION_CHANNEL_LIST,
  INTEGRATION_SECTION_LIST,
  INTEGRATIONS_MESSAGES,
  isIntegrationSectionId,
  type IntegrationChannelId,
  type IntegrationChannelStatusEntry,
  type IntegrationChannelStatusMap,
  type IntegrationSectionId,
} from "@/features/integrations";

type IntegrationsHubProps = {
  activeChannel: IntegrationChannelId;
  channelStatuses?: IntegrationChannelStatusMap;
  children: React.ReactNode;
};

export function IntegrationsHub({
  activeChannel,
  channelStatuses = {},
  children,
}: IntegrationsHubProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const activeSection: IntegrationSectionId = isIntegrationSectionId(sectionParam)
    ? sectionParam
    : "activate";

  const activeChannelConfig = INTEGRATION_CHANNEL_LIST.find(
    (c) => c.id === activeChannel,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {INTEGRATIONS_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {INTEGRATIONS_MESSAGES.pageDescription}
        </p>
      </div>

      <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-xl border bg-card md:flex-row">
        <aside className="w-full shrink-0 border-b md:w-64 md:border-b-0 md:border-r">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {INTEGRATIONS_MESSAGES.channelsTitle}
            </p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible">
            {INTEGRATION_CHANNEL_LIST.map((channel) => {
              const href = `${DASHBOARD_ROUTES.integrations}/${channel.id}?section=${activeSection}`;
              const isActive = pathname.startsWith(
                `${DASHBOARD_ROUTES.integrations}/${channel.id}`,
              );
              const entry: IntegrationChannelStatusEntry =
                channelStatuses[channel.id] ??
                (channel.available
                  ? { status: "disconnected" }
                  : { status: "coming_soon" });

              return (
                <Link
                  key={channel.id}
                  href={href}
                  className={cn(
                    "flex min-w-[10rem] items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors md:min-w-0",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <channel.icon className="mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {channel.label}
                      </span>
                      <ChannelStatusBadge entry={entry} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.detail ?? channel.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {activeChannelConfig?.label ?? activeChannel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeChannelConfig?.description}
                </p>
              </div>
            </div>
            <nav className="mt-4 flex flex-wrap gap-1">
              {INTEGRATION_SECTION_LIST.map((section) => {
                const href = section.href(activeChannel);
                const isSectionActive = activeSection === section.id;

                return (
                  <Button
                    key={section.id}
                    variant={isSectionActive ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link href={href}>{section.label}</Link>
                  </Button>
                );
              })}
            </nav>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

