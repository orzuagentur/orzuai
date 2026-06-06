import Link from "next/link";
import { ArrowRightIcon, StoreIcon } from "lucide-react";

import { DashboardScrollPage } from "@/components/layout/DashboardWorkspaceLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import {
  buildIntegrationActivateHref,
  getMarketplaceIntegrationChannels,
  INTEGRATIONS_MESSAGES,
  isChannelActivated,
  type IntegrationChannelStatusEntry,
  type IntegrationChannelStatusMap,
} from "@/features/integrations";
import {
  THIRD_PARTY_MARKETPLACE_APPS,
  type MarketplaceApp,
} from "@/features/integrations/marketplace-catalog";

type IntegrationsMarketplaceProps = {
  channelStatuses: IntegrationChannelStatusMap;
};

export function IntegrationsMarketplace({
  channelStatuses,
}: IntegrationsMarketplaceProps) {
  const marketplaceChannels = getMarketplaceIntegrationChannels();

  return (
    <DashboardScrollPage
      header={
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <StoreIcon className="size-6" />
            {INTEGRATIONS_MESSAGES.marketplaceTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {INTEGRATIONS_MESSAGES.marketplaceDescription}
          </p>
        </div>
      }
      toolbar={
        <Button variant="outline" asChild>
          <Link href={DASHBOARD_ROUTES.integrations}>
            {INTEGRATIONS_MESSAGES.backToIntegrations}
          </Link>
        </Button>
      }
    >
      <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Channels
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {marketplaceChannels.map((channel) => {
            const activated = isChannelActivated(channel.id, channelStatuses);
            const entry: IntegrationChannelStatusEntry =
              channelStatuses[channel.id] ?? { status: "disconnected" };

            return (
              <Link
                key={channel.id}
                href={buildIntegrationActivateHref(channel.id)}
                className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${getChannelIconContainerClassName(channel.id)}`}
                    >
                      <channel.icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{channel.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {activated && entry.detail
                          ? entry.detail
                          : channel.description}
                      </p>
                    </div>
                  </div>
                  {activated ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-success/30 bg-success/10 text-[10px] text-success"
                    >
                      {INTEGRATIONS_MESSAGES.statusActivated}
                    </Badge>
                  ) : (
                    <ChannelStatusBadge entry={entry} />
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  {activated
                    ? INTEGRATIONS_MESSAGES.configureChannel
                    : INTEGRATIONS_MESSAGES.connectChannel}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Apps & services
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {THIRD_PARTY_MARKETPLACE_APPS.map((app) => (
            <MarketplaceAppCard key={app.id} app={app} />
          ))}
        </div>
      </section>
      </div>
    </DashboardScrollPage>
  );
}

function MarketplaceAppCard({ app }: { app: MarketplaceApp }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{app.name}</p>
          <p className="text-xs text-muted-foreground">{app.category}</p>
        </div>
        <Badge
          variant={
            app.status === "available"
              ? "default"
              : app.status === "beta"
                ? "secondary"
                : "outline"
          }
        >
          {app.status === "coming_soon" ? "Coming soon" : app.status}
        </Badge>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground">{app.description}</p>
      {app.href ? (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          {INTEGRATIONS_MESSAGES.connectChannel}
          <ArrowRightIcon className="size-4" />
        </span>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Coming soon</p>
      )}
    </>
  );

  if (app.href) {
    return (
      <Link
        href={app.href}
        className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
      >
        {body}
      </Link>
    );
  }

  return <div className="flex flex-col rounded-xl border bg-card p-5">{body}</div>;
}
