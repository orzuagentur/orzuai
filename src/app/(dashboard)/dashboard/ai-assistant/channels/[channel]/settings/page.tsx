import { notFound } from "next/navigation";

import { ChannelAiBehaviorPanel } from "@/components/ai-assistant/ChannelAiBehaviorPanel";
import { isAiAgentChannel } from "@/features/integrations/constants";
import { getChannelAiSettings } from "@/services/channel-workspace.service";

type PageProps = {
  params: Promise<{ channel: string }>;
};

export default async function AiAssistantChannelSettingsPage({
  params,
}: PageProps) {
  const { channel } = await params;

  if (!isAiAgentChannel(channel)) {
    notFound();
  }

  const settings = await getChannelAiSettings(channel);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ChannelAiBehaviorPanel
        channel={channel}
        initialBehavior={settings.behavior}
      />
    </div>
  );
}
