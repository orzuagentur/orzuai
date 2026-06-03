import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
  INTEGRATIONS_MESSAGES,
  type IntegrationChannelId,
} from "@/features/integrations";

type ChannelWorkspaceBannerProps = {
  channel: IntegrationChannelId;
};

export function ChannelWorkspaceBanner({ channel }: ChannelWorkspaceBannerProps) {
  const channelConfig = INTEGRATION_CHANNEL_LIST.find((c) => c.id === channel);
  const label = channelConfig?.label ?? channel;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {INTEGRATIONS_MESSAGES.channelContextPrefix}{" "}
        <span className="font-medium text-foreground">{label}</span>
      </p>
      <Button variant="ghost" size="sm" asChild>
        <Link href={buildIntegrationActivateHref(channel)}>
          <ArrowLeft className="size-3.5" />
          {INTEGRATIONS_MESSAGES.goToActivate}
        </Link>
      </Button>
    </div>
  );
}
