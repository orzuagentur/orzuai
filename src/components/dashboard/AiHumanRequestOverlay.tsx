"use client";

import { useState } from "react";
import { Loader2Icon, UserRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

export function AiHumanRequestOverlay() {
  const router = useRouter();
  const { requests, declineRequest, dismissRequest } = useAiHumanRequests();
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"accept" | "decline" | null>(
    null,
  );

  if (requests.length === 0) {
    return null;
  }

  async function handleAccept(
    channel: MessagingChannel,
    conversationId: string,
    requestId: string,
  ) {
    setBusyRequestId(requestId);
    setBusyAction("accept");
    await dismissRequest(requestId);
    router.push(buildChatHref(channel, conversationId));
    setBusyRequestId(null);
    setBusyAction(null);
  }

  async function handleDecline(requestId: string) {
    setBusyRequestId(requestId);
    setBusyAction("decline");

    const result = await declineRequest(requestId);

    if (!result.success) {
      toast.error("Unable to decline this request.");
    } else if (result.customerNotified) {
      toast.success(AI_HUMAN_REQUEST_MESSAGES.declineSuccess);
    } else {
      toast.warning(AI_HUMAN_REQUEST_MESSAGES.declinePartial);
    }

    setBusyRequestId(null);
    setBusyAction(null);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4 md:justify-end md:pr-6">
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3">
        {requests.slice(0, 3).map((request) => {
          const isBusy = busyRequestId === request.id;

          return (
            <div
              key={request.id}
              className="rounded-xl border border-amber-500/40 bg-background/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <UserRoundIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {AI_HUMAN_REQUEST_MESSAGES.overlayTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {AI_HUMAN_REQUEST_MESSAGES.overlayDescription}
                  </p>
                  <p className="mt-2 truncate font-medium">{request.contactName}</p>
                  <p className="text-xs text-muted-foreground">
                    {getChannelLabel(request.channel)} ·{" "}
                    {formatRelativeTime(request.createdAt)}
                  </p>
                  <p className="mt-2 text-sm">{request.reason}</p>
                  {request.messagePreview ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {request.messagePreview}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy}
                  onClick={() =>
                    void handleAccept(
                      request.channel,
                      request.conversationId,
                      request.id,
                    )
                  }
                >
                  {isBusy && busyAction === "accept" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {AI_HUMAN_REQUEST_MESSAGES.accept}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => void handleDecline(request.id)}
                >
                  {isBusy && busyAction === "decline" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {AI_HUMAN_REQUEST_MESSAGES.decline}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
