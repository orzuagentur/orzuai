"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { INBOUND_ALERT_MESSAGES } from "@/features/dashboard/constants";
import { fetchConversationListItemAction } from "@/features/chats/actions/fetch-conversation-list-item";
import { useDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type {
  MessageSenderType,
  MessagingChannel,
} from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";

type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  hidden_for_business?: boolean;
  created_at: string;
};

function buildChatHref(channel: MessagingChannel, conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

function truncatePreview(content: string, maxLength = 120): string {
  const preview = getMessagePreviewText(content).trim();

  if (preview.length <= maxLength) {
    return preview;
  }

  return `${preview.slice(0, maxLength - 1)}…`;
}

function DashboardInboundAlertsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { incrementInboundMessageOptimistic, scheduleRefresh } =
    useDashboardNavBadges();
  const pathnameRef = useRef(pathname);
  const searchParamsRef = useRef(searchParams);

  pathnameRef.current = pathname;
  searchParamsRef.current = searchParams;

  const isViewingConversation = useCallback((conversationId: string) => {
    const currentPath = pathnameRef.current;
    const activeConversationId = searchParamsRef.current.get("conversation");

    return (
      currentPath.startsWith(DASHBOARD_ROUTES.chats) &&
      activeConversationId === conversationId
    );
  }, []);

  const shouldShowInAppAlert = useCallback((conversationId: string) => {
    return !isViewingConversation(conversationId);
  }, [isViewingConversation]);

  const showInboundAlert = useCallback(
    async (message: RealtimeMessageRow) => {
      const result = await fetchConversationListItemAction({
        conversationId: message.conversation_id,
      });

      const contactName = result.success
        ? result.data.contactName
        : INBOUND_ALERT_MESSAGES.newMessageTitle;
      const preview = truncatePreview(message.content);
      const href = buildChatHref(message.channel, message.conversation_id);

      toast.custom(
        (toastId) => (
          <div className="flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg">
            <div className="min-w-0">
              <p className="truncate font-medium">{contactName}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {preview || INBOUND_ALERT_MESSAGES.newMessageTitle}
              </p>
            </div>
            <Button
              size="sm"
              className="self-end"
              onClick={() => {
                toast.dismiss(toastId);
                router.push(href);
              }}
            >
              {INBOUND_ALERT_MESSAGES.openChat}
            </Button>
          </div>
        ),
        { duration: 10_000 },
      );
    },
    [router],
  );

  const handleInboundMessage = useCallback(
    (message: RealtimeMessageRow) => {
      if (message.sender_type !== "client" || message.hidden_for_business) {
        return;
      }

      if (isViewingConversation(message.conversation_id)) {
        scheduleRefresh();
        return;
      }

      incrementInboundMessageOptimistic({
        channel: message.channel,
      });

      scheduleRefresh();

      if (shouldShowInAppAlert(message.conversation_id)) {
        void showInboundAlert(message);
      }
    },
    [
      incrementInboundMessageOptimistic,
      isViewingConversation,
      scheduleRefresh,
      shouldShowInAppAlert,
      showInboundAlert,
    ],
  );

  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      channel = supabase
        .channel("dashboard-inbound-alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            handleInboundMessage(payload.new as RealtimeMessageRow);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [handleInboundMessage]);

  return null;
}

export function DashboardInboundAlerts() {
  return (
    <Suspense fallback={null}>
      <DashboardInboundAlertsContent />
    </Suspense>
  );
}
