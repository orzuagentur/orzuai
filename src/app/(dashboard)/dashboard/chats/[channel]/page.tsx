import { notFound } from "next/navigation";

import { ChatsChannelPanel } from "@/components/chats/ChatsChannelPanel";
import { isChatChannelId, type ChatChannelId } from "@/features/chats";

type ChatsChannelPageProps = {
  params: Promise<{ channel: string }>;
};

export default async function ChatsChannelPage({
  params,
}: ChatsChannelPageProps) {
  const { channel: channelParam } = await params;

  if (!isChatChannelId(channelParam)) {
    notFound();
  }

  const channel: ChatChannelId = channelParam;

  return <ChatsChannelPanel channelId={channel} />;
}
