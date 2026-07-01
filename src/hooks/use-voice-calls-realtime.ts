"use client";

import { useEffect, useRef, useState } from "react";

import { fetchVoiceCallsAction } from "@/features/voice/actions/fetch-voice-calls";
import { fetchVoiceCallDetailAction } from "@/features/voice/actions/fetch-voice-call-detail";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";

type VoiceCallSessionTurn = {
  role: "user" | "assistant";
  content: string;
};

const POLL_INTERVAL_MS = 3000;

type VoiceCallLogRealtimeRow = {
  id: string;
  business_id: string;
  direction: string;
  phone_number: string;
  status: string;
  provider: string;
  trigger_reason: string | null;
  call_mode: string;
  operator_user_id: string | null;
  created_at: string;
  contact_id: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  ai_handled: boolean;
  external_call_id: string | null;
  recording_url: string | null;
  conversation_id: string | null;
  handoff_at: string | null;
  human_handled: boolean;
};

type VoiceCallSessionRealtimeRow = {
  id: string;
  business_id: string;
  call_sid: string;
  direction: string;
  turns: VoiceCallSessionTurn[];
  turn_count: number;
};

type VoiceCallEventRealtimeRow = {
  id: string;
  business_id: string;
  call_log_id: string | null;
};

type UseVoiceCallsRealtimeOptions = {
  enabled?: boolean;
  businessId?: string | null;
  activeCallId?: string | null;
  onCallsChange: (
    updater: (current: VoiceInboxCallListItem[]) => VoiceInboxCallListItem[],
  ) => void;
  onActiveCallChange: (
    updater: (current: VoiceCallDetail | null) => VoiceCallDetail | null,
  ) => void;
};

function mapLogRowToListItem(row: VoiceCallLogRealtimeRow): VoiceInboxCallListItem {
  return {
    id: row.id,
    direction: row.direction as "inbound" | "outbound",
    phoneNumber: row.phone_number,
    status: row.status,
    provider: row.provider,
    triggerReason: row.trigger_reason,
    callMode: row.call_mode,
    operatorUserId: row.operator_user_id,
    createdAt: row.created_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    aiHandled: row.ai_handled,
    humanHandled: row.human_handled,
    handoffAt: row.handoff_at,
    contactId: row.contact_id,
    contactName: null,
    externalCallId: row.external_call_id,
    recordingUrl: row.recording_url,
    conversationId: row.conversation_id,
  };
}

function mergeCallListItem(
  current: VoiceInboxCallListItem,
  row: VoiceCallLogRealtimeRow,
): VoiceInboxCallListItem {
  return {
    ...current,
    ...mapLogRowToListItem(row),
    contactName: current.contactName,
  };
}

function getVoiceCallsRealtimeChannelName(businessId: string): string {
  return `voice-calls:${businessId}`;
}

export function useVoiceCallsRealtime({
  enabled = true,
  businessId = null,
  activeCallId = null,
  onCallsChange,
  onActiveCallChange,
}: UseVoiceCallsRealtimeOptions) {
  const onCallsChangeRef = useRef(onCallsChange);
  const onActiveCallChangeRef = useRef(onActiveCallChange);
  const activeCallIdRef = useRef(activeCallId);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  onCallsChangeRef.current = onCallsChange;
  onActiveCallChangeRef.current = onActiveCallChange;
  activeCallIdRef.current = activeCallId;

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setReconnectNonce((current) => current + 1);
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !businessId) {
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refreshActiveCall = async (callLogId: string) => {
      const result = await fetchVoiceCallDetailAction(callLogId);

      if (!result.success) {
        return;
      }

      onActiveCallChangeRef.current(() => result.data);
    };

    const handleLogInsert = async (row: VoiceCallLogRealtimeRow) => {
      const result = await fetchVoiceCallDetailAction(row.id);

      if (result.success) {
        const listItem: VoiceInboxCallListItem = {
          id: result.data.id,
          direction: result.data.direction,
          phoneNumber: result.data.phoneNumber,
          status: result.data.status,
          provider: result.data.provider,
          triggerReason: result.data.triggerReason,
          callMode: result.data.callMode,
          operatorUserId: result.data.operatorUserId,
          createdAt: result.data.createdAt,
          endedAt: result.data.endedAt,
          durationSeconds: result.data.durationSeconds,
          aiHandled: result.data.aiHandled,
          humanHandled: result.data.humanHandled,
          handoffAt: result.data.handoffAt,
          contactId: result.data.contactId,
          contactName: result.data.contactName,
          externalCallId: result.data.externalCallId,
          recordingUrl: result.data.recordingUrl,
          conversationId: result.data.conversationId,
        };

        onCallsChangeRef.current((current) => {
          if (current.some((call) => call.id === listItem.id)) {
            return current;
          }

          return [listItem, ...current];
        });
      }

      if (activeCallIdRef.current === row.id) {
        await refreshActiveCall(row.id);
      }
    };

    const handleLogUpdate = async (row: VoiceCallLogRealtimeRow) => {
      onCallsChangeRef.current((current) =>
        current.map((call) =>
          call.id === row.id ? mergeCallListItem(call, row) : call,
        ),
      );

      if (activeCallIdRef.current === row.id) {
        await refreshActiveCall(row.id);
      }
    };

    const handleSessionUpdate = (row: VoiceCallSessionRealtimeRow) => {
      onActiveCallChangeRef.current((current) => {
        if (!current || current.externalCallId !== row.call_sid) {
          return current;
        }

        return {
          ...current,
          turns: (row.turns as VoiceCallSessionTurn[]) ?? [],
          turnCount: row.turn_count,
        };
      });
    };

    const handleEventInsert = async (row: VoiceCallEventRealtimeRow) => {
      if (!row.call_log_id || activeCallIdRef.current !== row.call_log_id) {
        return;
      }

      await refreshActiveCall(row.call_log_id);
    };

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled) {
        return;
      }

      if (!authed) {
        return;
      }

      const postgresFilter = `business_id=eq.${businessId}`;

      channel = supabase
        .channel(getVoiceCallsRealtimeChannelName(businessId))
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "voice_call_logs",
            filter: postgresFilter,
          },
          (payload) => {
            void handleLogInsert(payload.new as VoiceCallLogRealtimeRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "voice_call_logs",
            filter: postgresFilter,
          },
          (payload) => {
            void handleLogUpdate(payload.new as VoiceCallLogRealtimeRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "voice_call_sessions",
            filter: postgresFilter,
          },
          (payload) => {
            handleSessionUpdate(payload.new as VoiceCallSessionRealtimeRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "voice_call_events",
            filter: postgresFilter,
          },
          (payload) => {
            void handleEventInsert(payload.new as VoiceCallEventRealtimeRow);
          },
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.setTimeout(() => {
              setReconnectNonce((current) => current + 1);
            }, 2000);
          }
        });
    })();

    return () => {
      cancelled = true;
      setRealtimeConnected(false);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [businessId, enabled, reconnectNonce]);

  useEffect(() => {
    if (!enabled || !businessId || !activeCallId) {
      return;
    }

    if (realtimeConnected) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchVoiceCallDetailAction(activeCallId).then((result) => {
        if (result.success) {
          onActiveCallChangeRef.current(() => result.data);
          onCallsChangeRef.current((current) =>
            current.map((call) =>
              call.id === result.data.id
                ? {
                    id: result.data.id,
                    direction: result.data.direction,
                    phoneNumber: result.data.phoneNumber,
                    status: result.data.status,
                    provider: result.data.provider,
                    triggerReason: result.data.triggerReason,
                    callMode: result.data.callMode,
                    operatorUserId: result.data.operatorUserId,
                    createdAt: result.data.createdAt,
                    endedAt: result.data.endedAt,
                    durationSeconds: result.data.durationSeconds,
                    aiHandled: result.data.aiHandled,
                    humanHandled: result.data.humanHandled,
                    handoffAt: result.data.handoffAt,
                    contactId: result.data.contactId,
                    contactName: result.data.contactName,
                    externalCallId: result.data.externalCallId,
                    recordingUrl: result.data.recordingUrl,
                    conversationId: result.data.conversationId,
                  }
                : call,
            ),
          );
        }
      });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeCallId, businessId, enabled, realtimeConnected]);

  useEffect(() => {
    if (!enabled || !businessId || realtimeConnected) {
      return;
    }

    const refreshCalls = () => {
      void fetchVoiceCallsAction().then((result) => {
        if (result.success) {
          onCallsChangeRef.current(() => result.data);
        }
      });
    };

    refreshCalls();
    const intervalId = window.setInterval(refreshCalls, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [businessId, enabled, realtimeConnected]);

  return { realtimeConnected };
}
