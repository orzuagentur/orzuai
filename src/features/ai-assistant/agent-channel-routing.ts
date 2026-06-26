import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

export function getChannelLabel(channel: MessagingIntegrationChannelId): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((entry) => entry.id === channel)?.label ??
    channel
  );
}
