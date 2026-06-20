import { redirect } from "next/navigation";

import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import { buildAiManagerHref } from "@/utils/ai-manager-url";
import { parseMessagingChannel } from "@/utils/ai-assistant-url";

function resolveChannelsTabChannel(
  value: string | undefined,
): MessagingIntegrationChannelId | null {
  const channel = parseMessagingChannel(value);

  if (
    channel &&
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel)
  ) {
    return channel as MessagingIntegrationChannelId;
  }

  return null;
}

type AiManagerPageProps = {
  searchParams: Promise<{
    channel?: string;
  }>;
};

export default async function AiManagerPage({ searchParams }: AiManagerPageProps) {
  const params = await searchParams;
  redirect(
    buildAiManagerHref({
      channel: resolveChannelsTabChannel(params.channel),
    }),
  );
}
