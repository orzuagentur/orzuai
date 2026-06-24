"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_HUMAN_REQUEST_MESSAGES } from "@/features/dashboard/constants";
import { useAiHumanRequests } from "@/contexts/ai-human-requests-context";
import { playManagerCalloutSound } from "@/lib/push/client";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";

function buildChatHref(channel: MessagingChannel, conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

function getChannelLabel(channel: MessagingChannel): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel)?.label ??
    channel
  );
}

export function DashboardAiHumanAlerts() {
  const router = useRouter();
  const { requests } = useAiHumanRequests();
  const seenRequestIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const showAlert = useCallback(
    (request: (typeof requests)[number]) => {
      playManagerCalloutSound();

      toast(AI_HUMAN_REQUEST_MESSAGES.toastTitle, {
        description: `${request.contactName} · ${getChannelLabel(request.channel)} — ${request.reason}`,
        duration: 12_000,
        action: (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              router.push(
                buildChatHref(request.channel, request.conversationId),
              )
            }
          >
            {AI_HUMAN_REQUEST_MESSAGES.connect}
          </Button>
        ),
      });
    },
    [router],
  );

  useEffect(() => {
    if (!initializedRef.current) {
      for (const request of requests) {
        seenRequestIdsRef.current.add(request.id);
      }
      initializedRef.current = true;
      return;
    }

    for (const request of requests) {
      if (seenRequestIdsRef.current.has(request.id)) {
        continue;
      }

      seenRequestIdsRef.current.add(request.id);
      showAlert(request);
    }
  }, [requests, showAlert]);

  return null;
}
