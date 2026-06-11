import { ChatsMonitorPanel } from "@/components/chats/ChatsMonitorPanel";
import {
  getChatsFavoritesPageData,
  resolveInboxActiveConversationContext,
} from "@/services/chat.service";

type ChatsFavoritesPageProps = {
  searchParams: Promise<{ conversation?: string }>;
};

export default async function ChatsFavoritesPage({
  searchParams,
}: ChatsFavoritesPageProps) {
  const { conversation: conversationId } = await searchParams;
  const [data, activeContext] = await Promise.all([
    getChatsFavoritesPageData(),
    resolveInboxActiveConversationContext(conversationId?.trim()),
  ]);

  return (
    <ChatsMonitorPanel
      favoritesOnly
      hasBusiness={data.hasBusiness}
      channels={data.channels}
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
