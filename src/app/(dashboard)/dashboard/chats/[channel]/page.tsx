import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatsChannelPanel } from "@/components/chats/ChatsChannelPanel";
import { ChatsHub } from "@/components/chats/ChatsHub";
import { Skeleton } from "@/components/ui/skeleton";
import { isChatChannelId, type ChatChannelId } from "@/features/chats";
import { getChatsChannelPageData, getChatsMonitorData } from "@/services/chat.service";

type ChatsChannelPageProps = {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ conversation?: string }>;
};

function ChatsChannelFallback() {
  return <Skeleton className="min-h-[24rem] w-full" />;
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
