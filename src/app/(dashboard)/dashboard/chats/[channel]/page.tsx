import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isChatChannelId } from "@/features/chats";

type ChatsChannelPageProps = {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ conversation?: string }>;
};

/** Channel filtering is client-side on /chats so refresh always resets to All. */
export default async function ChatsChannelPage({
  params,
  searchParams,
}: ChatsChannelPageProps) {
  const { channel: channelParam } = await params;
  const { conversation } = await searchParams;

  if (!isChatChannelId(channelParam)) {
    redirect(DASHBOARD_ROUTES.chats);
  }

  const query = conversation?.trim()
    ? `?conversation=${encodeURIComponent(conversation.trim())}`
    : "";
  redirect(`${DASHBOARD_ROUTES.chats}${query}`);
}
