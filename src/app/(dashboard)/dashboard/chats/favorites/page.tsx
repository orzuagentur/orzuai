import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type ChatsFavoritesPageProps = {
  searchParams: Promise<{ conversation?: string }>;
};

/** Favorites is a client filter on /chats so refresh always resets to All. */
export default async function ChatsFavoritesPage({
  searchParams,
}: ChatsFavoritesPageProps) {
  const { conversation } = await searchParams;
  const query = conversation?.trim()
    ? `?conversation=${encodeURIComponent(conversation.trim())}`
    : "";
  redirect(`${DASHBOARD_ROUTES.chats}${query}`);
}
