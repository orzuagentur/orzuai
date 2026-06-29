import { notFound } from "next/navigation";

import { ChatsChannelPanel } from "@/components/chats/ChatsChannelPanel";
import { isChatChannelId, type ChatChannelId } from "@/features/chats";
import {
  getChatsChannelPageData,
  resolveInboxActiveConversationContext,
  resolveInboxBusinessContext,
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
  const inboxContext = await resolveInboxBusinessContext();

  const [channelData, activeContext] = await Promise.all([
    getChatsChannelPageData(channel, inboxContext),
    resolveInboxActiveConversationContext(conversationId?.trim(), inboxContext),
  ]);

  return (
    <ChatsChannelPanel
      channelId={channel}
      hasBusiness={channelData.hasBusiness}
      channel={channelData.channel}
      visibleChannelIds={channelData.visibleChannelIds}
      voiceInboxEnabled={channelData.voiceInboxEnabled}
      smsInboxEnabled={channelData.smsInboxEnabled}
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
