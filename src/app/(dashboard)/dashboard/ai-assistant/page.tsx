import { ChannelWorkspacePage } from "@/components/dashboard/ChannelWorkspacePage";

type AiAssistantPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
  const { channel } = await searchParams;

  return (
    <ChannelWorkspacePage
      title="AI Assistant"
      channelParam={channel}
      section="ai-assistant"
    />
  );
}
