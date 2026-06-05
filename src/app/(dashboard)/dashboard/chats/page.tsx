import Link from "next/link";
import { Suspense } from "react";

import { ChatsHub } from "@/components/chats/ChatsHub";
import { ChatsMonitorPanel } from "@/components/chats/ChatsMonitorPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConversationListSkeleton } from "@/components/chats/ConversationListSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats";
import { getChatsMonitorData } from "@/services/chat.service";

function ChatsMonitorFallback() {
  return (
    <div className="rounded-xl border p-4">
      <ConversationListSkeleton rows={8} />
    </div>
  );
}

export default async function ChatsPage() {
  const data = await getChatsMonitorData();

  if (!data.hasBusiness) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{CHAT_MESSAGES.noBusinessTitle}</CardTitle>
            <CardDescription>{CHAT_MESSAGES.noBusinessDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<ChatsMonitorFallback />}>
      <ChatsHub activeChannel={null} monitorChannels={data.channels}>
        <ChatsMonitorPanel {...data} />
      </ChatsHub>
    </Suspense>
  );
}
