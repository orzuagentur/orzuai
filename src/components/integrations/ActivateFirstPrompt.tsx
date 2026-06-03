import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
  INTEGRATIONS_MESSAGES,
  type IntegrationChannelId,
} from "@/features/integrations";

type ActivateFirstPromptProps = {
  channel: IntegrationChannelId;
};

export function ActivateFirstPrompt({ channel }: ActivateFirstPromptProps) {
  const label =
    INTEGRATION_CHANNEL_LIST.find((c) => c.id === channel)?.label ?? channel;

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle>{INTEGRATIONS_MESSAGES.activateFirstTitle}</CardTitle>
        <CardDescription>
          {label} — {INTEGRATIONS_MESSAGES.activateFirstDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={buildIntegrationActivateHref(channel)}>
            {INTEGRATIONS_MESSAGES.goToActivate}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
