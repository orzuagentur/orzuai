"use client";

import { useState } from "react";
import { BellIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_HUMAN_REQUEST_MESSAGES } from "@/features/dashboard/constants";
import { useAiHumanRequests } from "@/contexts/ai-human-requests-context";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";
import { formatRelativeTime } from "@/utils/dashboard";

function buildChatHref(channel: MessagingChannel, conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

function getChannelLabel(channel: MessagingChannel): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel)?.label ??
    channel
  );
}

export function AiHumanRequestsButton() {
  const router = useRouter();
  const { requests, count, isLoading, dismissRequest } = useAiHumanRequests();
  const [open, setOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  async function handleDismiss(requestId: string) {
    setDismissingId(requestId);
    await dismissRequest(requestId);
    setDismissingId(null);
  }

  function handleConnect(channel: MessagingChannel, conversationId: string) {
    setOpen(false);
    router.push(buildChatHref(channel, conversationId));
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            tooltip={AI_HUMAN_REQUEST_MESSAGES.buttonLabel}
            className="h-10 text-[15px] [&_svg]:size-5"
            onClick={() => setOpen(true)}
          >
            <BellIcon />
            <span>{AI_HUMAN_REQUEST_MESSAGES.buttonLabel}</span>
            {count > 0 ? (
              <SidebarMenuBadge>
                {count > 99 ? "99+" : count}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-5 text-left">
            <SheetTitle>{AI_HUMAN_REQUEST_MESSAGES.panelTitle}</SheetTitle>
            <SheetDescription>
              {AI_HUMAN_REQUEST_MESSAGES.panelDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {AI_HUMAN_REQUEST_MESSAGES.emptyState}
              </p>
            ) : (
              <ul className="space-y-3">
                {requests.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {request.contactName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getChannelLabel(request.channel)} ·{" "}
                          {formatRelativeTime(request.createdAt)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={dismissingId === request.id}
                        aria-label={AI_HUMAN_REQUEST_MESSAGES.dismiss}
                        onClick={() => void handleDismiss(request.id)}
                      >
                        {dismissingId === request.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </div>

                    <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                      {request.reason}
                    </p>

                    {request.messagePreview ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {request.messagePreview}
                      </p>
                    ) : null}

                    <Button
                      type="button"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() =>
                        handleConnect(
                          request.channel,
                          request.conversationId,
                        )
                      }
                    >
                      {AI_HUMAN_REQUEST_MESSAGES.connect}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
