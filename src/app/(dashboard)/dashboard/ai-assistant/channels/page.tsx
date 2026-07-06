import { AiAssistantHubPanel } from "@/components/ai-assistant/AiAssistantHubPanel";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantChannelsPage() {
  const data = await getAiAssistantPageData();

  return (
    <AiAssistantHubPanel
      channels={data.channels}
      enabledChannelCount={data.enabledChannelCount}
    />
  );
}
