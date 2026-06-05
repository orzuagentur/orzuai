import { Badge } from "@/components/ui/badge";
import { INTEGRATIONS_MESSAGES } from "@/features/integrations";

export type WebhookHealthStatus = "receiving" | "waiting" | "disconnected";

type IntegrationWebhookHealthProps = {
  status: WebhookHealthStatus;
};

export function resolveWebhookHealthStatus({
  connected,
  lastActivityAt,
  hasRecentMessages,
}: {
  connected: boolean;
  lastActivityAt: string | null;
  hasRecentMessages?: boolean;
}): WebhookHealthStatus {
  if (!connected) {
    return "disconnected";
  }

  if (hasRecentMessages) {
    return "receiving";
  }

  if (lastActivityAt) {
    const hoursSinceActivity =
      (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceActivity <= 72) {
      return "receiving";
    }
  }

  return "waiting";
}

export function IntegrationWebhookHealth({
  status,
}: IntegrationWebhookHealthProps) {
  if (status === "receiving") {
    return (
      <Badge variant="default">{INTEGRATIONS_MESSAGES.webhookReceiving}</Badge>
    );
  }

  if (status === "waiting") {
    return (
      <Badge variant="secondary">{INTEGRATIONS_MESSAGES.webhookWaiting}</Badge>
    );
  }

  return (
    <Badge variant="outline">{INTEGRATIONS_MESSAGES.webhookDisconnected}</Badge>
  );
}
