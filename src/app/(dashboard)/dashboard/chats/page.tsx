import { Suspense } from "react";

import { ChatsPanel } from "@/components/chats/ChatsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChatsPageData } from "@/services/chat.service";

type ChatsPageProps = {
  searchParams: Promise<{
    conversation?: string;
  }>;
};

function ChatsPanelFallback() {
  return <Skeleton className="min-h-[calc(100vh-12rem)] w-full rounded-xl" />;
}

export default async function ChatsPage({ searchParams }: ChatsPageProps) {
  const params = await searchParams;
  const conversationId = params.conversation?.trim();
  const data = await getChatsPageData(conversationId);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {CHAT_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.pageDescription}
        </p>
      </div>

      <Suspense fallback={<ChatsPanelFallback />}>
        <ChatsPanel {...data} />
      </Suspense>
    </div>
  );
}
