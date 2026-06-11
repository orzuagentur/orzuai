import { notFound } from "next/navigation";

import { ChatsChannelPanel } from "@/components/chats/ChatsChannelPanel";
import { isChatChannelId, type ChatChannelId } from "@/features/chats";
import {
  getChatsChannelPageData,
  getChatsMonitorData,
  resolveInboxActiveConversationContext,
} from "@/services/chat.service";

type ChatsChannelPageProps = {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ conversation?: string }>;
};

export default async function ChatsChannelPage({
  params,
  searchParams,
}: ChatsChannelPageProps) {
  const { channel: channelParam } = await params;
  const { conversation: conversationId } = await searchParams;

  if (!isChatChannelId(channelParam)) {
    notFound();
  }

  const channel: ChatChannelId = channelParam;

  const [monitorData, channelData, activeContext] = await Promise.all([
    getChatsMonitorData(),
    getChatsChannelPageData(channel),
    resolveInboxActiveConversationContext(conversationId?.trim()),
  ]);

  return (
    <ChatsChannelPanel
      channelId={channel}
      hasBusiness={channelData.hasBusiness}
      channel={channelData.channel}
      channelStats={monitorData.channels}
      channelConnected={channelData.channelConnected}
      aiEnabled={channelData.aiEnabled}
      conversations={channelData.conversations}
      cannedResponses={channelData.cannedResponses}
      activeConversation={activeContext.activeConversation}
      activeChannelConnected={activeContext.activeChannelConnected}
      activeAiEnabled={activeContext.activeAiEnabled}
      activeCannedResponses={activeContext.activeCannedResponses}
    />
  );
}
