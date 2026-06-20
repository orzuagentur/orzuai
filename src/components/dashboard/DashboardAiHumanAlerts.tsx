"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_HUMAN_REQUEST_MESSAGES } from "@/features/dashboard/constants";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { MessagingChannel } from "@/types/database.types";

type RealtimeHumanRequestRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  contact_name: string;
  reason: string;
};

function buildChatHref(channel: MessagingChannel, conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

export function DashboardAiHumanAlerts() {
  return (
    <Suspense fallback={null}>
      <DashboardAiHumanAlertsContent />
    </Suspense>
  );
}

function DashboardAiHumanAlertsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const searchParamsRef = useRef(searchParams);
  const seenRequestIdsRef = useRef<Set<string>>(new Set());

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

  const showHumanRequestAlert = useCallback(
    (row: RealtimeHumanRequestRow) => {
      if (isViewingConversation(row.conversation_id)) {
        return;
      }

      const contactName = row.contact_name.trim() || "Customer";
      const reason =
        row.reason.trim() || AI_HUMAN_REQUEST_MESSAGES.toastReasonFallback;
      const href = buildChatHref(row.channel, row.conversation_id);

      toast.custom(
        (toastId) => (
          <div className="flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 rounded-lg border border-amber-500/30 bg-background p-4 shadow-lg">
            <div className="min-w-0">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                {AI_HUMAN_REQUEST_MESSAGES.toastTitle}
              </p>
              <p className="truncate font-medium">{contactName}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {reason}
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
              {AI_HUMAN_REQUEST_MESSAGES.connect}
            </Button>
          </div>
        ),
        { duration: 15_000 },
      );
    },
    [isViewingConversation, router],
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
        .channel("dashboard-ai-human-alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            const row = payload.new as RealtimeHumanRequestRow;

            if (seenRequestIdsRef.current.has(row.id)) {
              return;
            }

            seenRequestIdsRef.current.add(row.id);
            showHumanRequestAlert(row);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            const row = payload.new as RealtimeHumanRequestRow;

            if (seenRequestIdsRef.current.has(row.id)) {
              return;
            }

            seenRequestIdsRef.current.add(row.id);
            showHumanRequestAlert(row);
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
  }, [showHumanRequestAlert]);

  return null;
}
