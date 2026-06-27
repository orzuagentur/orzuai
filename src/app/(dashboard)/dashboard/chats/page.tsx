import { ChatsMonitorPanel } from "@/components/chats/ChatsMonitorPanel";
import {
  getChatsMonitorPageData,
  resolveInboxActiveConversationContext,
  resolveInboxBusinessContext,
} from "@/services/chat.service";

type ChatsPageProps = {
  searchParams: Promise<{ conversation?: string }>;
};

export default async function ChatsPage({ searchParams }: ChatsPageProps) {
  const { conversation: conversationId } = await searchParams;
  const inboxContext = await resolveInboxBusinessContext();
  const [data, activeContext] = await Promise.all([
    getChatsMonitorPageData(inboxContext),
    resolveInboxActiveConversationContext(conversationId?.trim(), inboxContext),
  ]);

  return (
    <ChatsMonitorPanel
      hasBusiness={data.hasBusiness}
      channels={data.channels}
      voiceInboxEnabled={data.voiceInboxEnabled}
      conversations={data.conversations}
      conversationsTotalCount={data.conversationsTotalCount}
      conversationsHasMore={data.conversationsHasMore}
      needsAttentionConversations={data.needsAttentionConversations}
      activeConversation={activeContext.activeConversation}
      activeChannelConnected={activeContext.activeChannelConnected}
      activeAiEnabled={activeContext.activeAiEnabled}
      activeCannedResponses={activeContext.activeCannedResponses}
    />
  );
}
