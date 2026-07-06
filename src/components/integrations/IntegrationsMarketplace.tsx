"use client";

import Link from "next/link";
import { ArrowRightIcon, BotIcon } from "lucide-react";

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
  groupMarketplaceChannels,
  MARKETPLACE_CATEGORIES,
} from "@/features/integrations/marketplace-categories";
import {
  MARKETPLACE_AI_LINK,
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
  const channelGroups = groupMarketplaceChannels(marketplaceChannels);
  const partnerApps = THIRD_PARTY_MARKETPLACE_APPS.filter(
    (app) => app.id !== "ai_assistant" && app.id !== "google_calendar",
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {INTEGRATIONS_MESSAGES.marketplaceDescription}
        </p>
        <Button variant="outline" asChild>
          <Link href={DASHBOARD_ROUTES.integrations}>
            {INTEGRATIONS_MESSAGES.backToIntegrations}
          </Link>
        </Button>
      </div>

      <MarketplaceAiCard />

      {channelGroups.map(({ category, channels }) => (
        <section key={category.id} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {category.label}
            </h2>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <MarketplaceChannelCard
                key={channel.id}
                channel={channel}
                channelStatuses={channelStatuses}
              />
            ))}
          </div>
        </section>
      ))}

      {partnerApps.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {MARKETPLACE_CATEGORIES.find((item) => item.id === "other")?.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              Billing, calendar, and partner apps.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {partnerApps.map((app) => (
              <MarketplaceAppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MarketplaceAiCard() {
  const app = MARKETPLACE_AI_LINK;

  return (
    <Link
      href={app.href!}
      className="group flex items-start gap-4 rounded-xl border bg-gradient-to-br from-violet-500/5 via-background to-background p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
        <BotIcon className="size-6" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{INTEGRATIONS_MESSAGES.marketplaceAiTitle}</p>
          <Badge variant="secondary" className="text-[10px]">
            AI
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {INTEGRATIONS_MESSAGES.marketplaceAiDescription}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Open AI settings
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function MarketplaceChannelCard({
  channel,
  channelStatuses,
}: {
  channel: ReturnType<typeof getMarketplaceIntegrationChannels>[number];
  channelStatuses: IntegrationChannelStatusMap;
}) {
  const activated = isChannelActivated(channel.id, channelStatuses);
  const entry: IntegrationChannelStatusEntry =
    channelStatuses[channel.id] ?? { status: "disconnected" };

  return (
    <Link
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
              {activated && entry.detail ? entry.detail : channel.description}
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
          : entry.status === "coming_soon"
            ? INTEGRATIONS_MESSAGES.statusComingSoon
            : INTEGRATIONS_MESSAGES.connectChannel}
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function MarketplaceAppCard({ app }: { app: MarketplaceApp }) {
  const Icon = app.icon;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5" />
            </div>
          ) : null}
          <div>
            <p className="font-medium">{app.name}</p>
            <p className="text-xs text-muted-foreground">{app.category}</p>
          </div>
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
