"use client";

import Link from "next/link";

import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { ChatsPageData } from "@/types/chat.types";

type ChatsPanelProps = ChatsPageData;

export function ChatsPanel({
  hasBusiness,
  whatsappConnected,
  aiEnabled,
  conversations,
  activeConversation,
}: ChatsPanelProps) {
  if (!hasBusiness) {
    return (
      <Card className="mx-auto max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{CHAT_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {CHAT_MESSAGES.noBusinessDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeConversationId = activeConversation?.id ?? null;

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-1 overflow-hidden rounded-xl border bg-card">
      <aside className="flex w-full flex-col border-r md:w-80 lg:w-96">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Conversations</p>
          <p className="text-xs text-muted-foreground">
            {conversations.length} total
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatList
            conversations={conversations}
            activeConversationId={activeConversationId}
          />
        </div>
      </aside>

      <section
        className={
          activeConversationId
            ? "flex min-h-[420px] flex-1 flex-col"
            : "hidden min-h-[420px] flex-1 flex-col md:flex"
        }
      >
        <ChatWindow
          conversation={activeConversation}
          aiEnabled={aiEnabled}
          whatsappConnected={whatsappConnected}
        />
      </section>
    </div>
  );
}
