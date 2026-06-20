import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { DASHBOARD_ROUTES } from "@/constants/routes";

/** @deprecated Use DASHBOARD_ROUTES.aiAssistantSection */
export function buildAiManagerHref(input?: {
  channel?: MessagingIntegrationChannelId | null;
}): string {
  if (!input?.channel) {
    return DASHBOARD_ROUTES.aiAssistantSection;
  }

  const params = new URLSearchParams();
  params.set("channel", input.channel);
  return `${DASHBOARD_ROUTES.aiAssistantSection}?${params.toString()}`;
}
