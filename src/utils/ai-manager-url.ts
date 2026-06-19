import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";

export function buildAiManagerHref(input?: {
  channel?: MessagingIntegrationChannelId | null;
}): string {
  const channel = input?.channel;

  if (
    channel &&
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel)
  ) {
    return `${DASHBOARD_ROUTES.aiManager}?channel=${channel}`;
  }

  return DASHBOARD_ROUTES.aiManager;
}
