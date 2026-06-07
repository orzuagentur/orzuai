import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatsChannelPanel } from "@/components/chats/ChatsChannelPanel";
import { ChatsHub } from "@/components/chats/ChatsHub";
import { ConversationListSkeleton } from "@/components/chats/ConversationListSkeleton";
import { isChatChannelId, type ChatChannelId } from "@/features/chats";
import { getChatsChannelPageData, getChatsMonitorData } from "@/services/chat.service";

type ChatsChannelPageProps = {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ conversation?: string }>;
};

function ChatsChannelFallback() {
  return (
    <div className="min-h-[24rem] rounded-xl border p-4">
      <ConversationListSkeleton rows={8} />
    </div>
  );
}

export default async function ChatsChannelPage({
  params,
  searchParams,
}: ChatsChannelPageProps) {
  const { channel: channelParam } = await params;
  const { conversation: conversationParam } = await searchParams;

  if (!isChatChannelId(channelParam)) {
    notFound();
  }

  const channel: ChatChannelId = channelParam;
  const conversationId = conversationParam?.trim();

  const [monitorData, channelData] = await Promise.all([
    getChatsMonitorData(),
    getChatsChannelPageData(channel, conversationId),
  ]);

  return (
    <Suspense fallback={<ChatsChannelFallback />}>
      <ChatsHub activeChannel={channel} monitorChannels={monitorData.channels}>
        <ChatsChannelPanel channelId={channel} {...channelData} />
      </ChatsHub>
    </Suspense>
  );
}
