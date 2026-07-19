"use client";

import { useState } from "react";
import {
  BellIcon,
  BotIcon,
  Loader2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { SIDEBAR_NAV_BUTTON_CLASS } from "@/features/navigation/sidebar-nav-ui";
import { useAiHumanRequests } from "@/contexts/ai-human-requests-context";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import type { BusinessNotification } from "@/types/business-notification.types";
import type { MessagingChannel } from "@/types/database.types";
import { formatRelativeTime } from "@/utils/dashboard";
import { cn } from "@/lib/utils";

function buildChatHref(channel: MessagingChannel, conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

function getChannelLabel(channel: MessagingChannel): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel)?.label ??
    channel
  );
}

function isPendingHumanRequest(
  notification: BusinessNotification,
  pendingRequestIds: Set<string>,
): boolean {
  return (
    notification.kind === "human_request" &&
    !notification.resolvedAt &&
    notification.sourceId !== null &&
    pendingRequestIds.has(notification.sourceId)
  );
}

type AiHumanRequestsButtonProps = {
  /** sidebar = full nav row; icon = compact header control (mobile) */
  variant?: "sidebar" | "icon";
};

export function AiHumanRequestsButton({
  variant = "sidebar",
}: AiHumanRequestsButtonProps) {
  const router = useRouter();
  const {
    notifications,
    requests,
    unreadCount,
    isLoading,
    markAllRead,
    dismissRequest,
    deleteNotification,
  } = useAiHumanRequests();
  const [open, setOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pendingRequestIds = new Set(requests.map((request) => request.id));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      void markAllRead();
    }
  }

  async function handleDismiss(requestId: string) {
    setDismissingId(requestId);
    await dismissRequest(requestId);
    setDismissingId(null);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;

    setIsDeleting(true);
    const success = await deleteNotification(confirmDeleteId);
    setIsDeleting(false);
    setConfirmDeleteId(null);

    if (!success) {
      toast.error("Unable to delete notification.");
    }
  }

  function handleConnect(
    channel: MessagingChannel,
    conversationId: string,
    requestId?: string | null,
  ) {
    setOpen(false);

    if (requestId) {
      void dismissRequest(requestId);
    }

    router.push(buildChatHref(channel, conversationId));
  }

  const trigger =
    variant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-9 shrink-0"
        aria-label={AI_HUMAN_REQUEST_MESSAGES.buttonLabel}
        onClick={() => handleOpenChange(true)}
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>
    ) : (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            tooltip={AI_HUMAN_REQUEST_MESSAGES.buttonLabel}
            className={SIDEBAR_NAV_BUTTON_CLASS}
            onClick={() => handleOpenChange(true)}
          >
            <BellIcon />
            <span>{AI_HUMAN_REQUEST_MESSAGES.buttonLabel}</span>
            {unreadCount > 0 ? (
              <SidebarMenuBadge>
                {unreadCount > 99 ? "99+" : unreadCount}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={handleOpenChange}>
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
            ) : notifications.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {AI_HUMAN_REQUEST_MESSAGES.emptyState}
              </p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notification) => {
                  const isHuman = notification.kind === "human_request";
                  const isPending = isPendingHumanRequest(
                    notification,
                    pendingRequestIds,
                  );
                  const isUnread = !notification.readAt;
                  const isDeletingThis = deletingId === notification.id;

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "relative rounded-lg border p-4",
                        isHuman
                          ? "border-amber-500/25 bg-amber-500/5"
                          : "bg-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3 pr-6">
                          <div
                            className={
                              isHuman
                                ? "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                            }
                          >
                            {isHuman ? (
                              <UserRoundIcon className="size-4" />
                            ) : (
                              <BotIcon className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">
                                {notification.contactName}
                              </p>
                              {isUnread ? (
                                <span className="size-2 shrink-0 rounded-full bg-primary" />
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isHuman
                                ? AI_HUMAN_REQUEST_MESSAGES.humanRequestLabel
                                : AI_HUMAN_REQUEST_MESSAGES.aiActionLabel}{" "}
                              · {getChannelLabel(notification.channel)} ·{" "}
                              {formatRelativeTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 size-7 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={isDeletingThis || isDeleting}
                          aria-label={AI_HUMAN_REQUEST_MESSAGES.deleteNotification}
                          onClick={() => setConfirmDeleteId(notification.id)}
                        >
                          {isDeletingThis ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : (
                            <XIcon className="size-3.5" />
                          )}
                        </Button>
                      </div>

                      <p
                        className={
                          isHuman
                            ? "mt-2 text-sm font-medium text-amber-800 dark:text-amber-200"
                            : "mt-2 text-sm font-medium"
                        }
                      >
                        {notification.body}
                      </p>

                      {notification.details.messagePreview ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {notification.details.messagePreview}
                        </p>
                      ) : null}

                      {notification.details.actions &&
                      notification.details.actions.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {notification.details.actions.map((action) => (
                            <li key={action} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {isPending ? (
                        <div className="mt-4 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={dismissingId === notification.sourceId}
                            onClick={() =>
                              void handleDismiss(notification.sourceId!)
                            }
                          >
                            {dismissingId === notification.sourceId ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              AI_HUMAN_REQUEST_MESSAGES.dismiss
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              handleConnect(
                                notification.channel,
                                notification.conversationId,
                                notification.sourceId,
                              )
                            }
                          >
                            {AI_HUMAN_REQUEST_MESSAGES.connect}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center justify-between gap-2">
                          {notification.resolvedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {AI_HUMAN_REQUEST_MESSAGES.resolvedLabel}
                            </span>
                          ) : (
                            <span />
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleConnect(
                                notification.channel,
                                notification.conversationId,
                              )
                            }
                          >
                            {AI_HUMAN_REQUEST_MESSAGES.openChat}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeleting) {
            setConfirmDeleteId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {AI_HUMAN_REQUEST_MESSAGES.deleteNotificationTitle}
            </DialogTitle>
            <DialogDescription>
              {AI_HUMAN_REQUEST_MESSAGES.deleteNotificationDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setConfirmDeleteId(null)}
            >
              {AI_HUMAN_REQUEST_MESSAGES.deleteNotificationCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (confirmDeleteId) {
                  setDeletingId(confirmDeleteId);
                }
                void handleConfirmDelete().finally(() => setDeletingId(null));
              }}
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                AI_HUMAN_REQUEST_MESSAGES.deleteNotificationConfirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
