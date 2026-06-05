import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { ChannelStatusBadge } from "@/components/integrations/ChannelStatusBadge";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
  INTEGRATIONS_MESSAGES,
  type IntegrationChannelStatusEntry,
  type IntegrationChannelStatusMap,
} from "@/features/integrations";

type IntegrationsIndexProps = {
  channelStatuses: IntegrationChannelStatusMap;
};

export function IntegrationsIndex({ channelStatuses }: IntegrationsIndexProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {INTEGRATIONS_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {INTEGRATIONS_MESSAGES.indexDescription}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_CHANNEL_LIST.map((channel) => {
          const entry: IntegrationChannelStatusEntry =
            channelStatuses[channel.id] ??
            (channel.available
              ? { status: "disconnected" }
              : { status: "coming_soon" });

          return (
            <Link
              key={channel.id}
              href={buildIntegrationActivateHref(channel.id)}
              className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
    </div>
  );
}
