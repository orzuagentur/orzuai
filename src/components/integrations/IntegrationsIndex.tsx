import Link from "next/link";
import { ArrowRightIcon, StoreIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";

import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import {
  buildIntegrationActivateHref,
  getActivatedIntegrationChannels,
  INTEGRATIONS_MESSAGES,
  type IntegrationChannelStatusEntry,
  type IntegrationChannelStatusMap,
} from "@/features/integrations";

type IntegrationsIndexProps = {
  channelStatuses: IntegrationChannelStatusMap;
};

export function IntegrationsIndex({ channelStatuses }: IntegrationsIndexProps) {
  const activatedChannels = getActivatedIntegrationChannels(channelStatuses);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {INTEGRATIONS_MESSAGES.indexDescription}
        </p>
        <Button variant="outline" asChild>
          <Link href={DASHBOARD_ROUTES.marketplace}>
            <StoreIcon className="size-4" />
            Marketplace
          </Link>
        </Button>
      </div>

      {activatedChannels.length === 0 ? (
        <Card className="max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{INTEGRATIONS_MESSAGES.indexEmptyTitle}</CardTitle>
            <CardDescription>
              {INTEGRATIONS_MESSAGES.indexEmptyDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.marketplace}>
                <StoreIcon className="size-4" />
                Browse Marketplace
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activatedChannels.map((channel) => {
            const entry: IntegrationChannelStatusEntry =
              channelStatuses[channel.id] ?? { status: "connected" };

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
                      <p className="font-medium leading-none">{channel.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.detail ?? channel.description}
                      </p>
                    </div>
                  </div>
                  <ChannelStatusBadge entry={entry} />
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  {INTEGRATIONS_MESSAGES.configureChannel}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
