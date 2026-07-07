import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageRepository } from "@/repositories/message.repository";
import {
  getVoiceRepository,
  type VoicePostCallJobType,
  type VoiceCallEventRow,
  type VoiceCallLogInboxRow,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";
import type { InboxBusinessContext } from "@/services/chat.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import { getTwilioConnection } from "@/services/twilio-integration.service";
import { completeOperatorCallAfterCustomerLeave } from "@/services/voice-conference.service";
import { guardAiOutboundOnMissedStatus } from "@/services/voice-ai-outbound-guard.service";
import { cancelOutboundVoiceCall } from "@/services/voice-outbound-cancel.service";
import { getVoiceClientConfig } from "@/services/voice-client.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { dispatchVoicePostCallWorker } from "@/services/voice-post-call-queue.service";
import { updateConversationLastMessageFromInsert } from "@/services/conversation-last-message.service";
import {
  getActiveMessagingChannelIds,
} from "@/features/integrations";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";
import type {
  VoiceCallDetail,
  VoiceCallEventItem,
  VoiceInboxCallListItem,
  VoiceInboxPageData,
} from "@/types/voice-inbox.types";

function mapCallLogRow(row: VoiceCallLogInboxRow): VoiceInboxCallListItem {
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
    contactName: row.contacts?.name ?? null,
    externalCallId: row.external_call_id,
    recordingUrl: row.recording_url,
    conversationId: row.conversation_id,
  };
}

function mapCallEventRow(row: VoiceCallEventRow): VoiceCallEventItem {
  return {
    id: row.id,
    eventType: row.event_type,
    actorType: row.actor_type,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export async function isVoiceInboxVisible(businessId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const connection = await getTwilioConnection(businessId);
  return connection?.status === "connected";
}

async function resolveVisibleChannelIds(businessId: string) {
  const channelStatuses = await getChannelConnectionStatuses(businessId);
  return getActiveMessagingChannelIds(channelStatuses);
}

export async function isSmsInboxVisible(businessId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const [voiceVisible, settings] = await Promise.all([
    isVoiceInboxVisible(businessId),
    getVoiceAgentSettings(businessId),
  ]);

  return voiceVisible && settings.smsEnabled;
}

export async function getVoiceInboxPageData(
  inboxContext?: InboxBusinessContext | null,
  activeCallId?: string | null,
): Promise<VoiceInboxPageData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      businessId: null,
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
      softphoneEnabled: false,
      businessPhoneNumber: null,
      visibleChannelIds: [],
      calls: [],
      activeCall: null,
    };
  }

  if (!inboxContext) {
    return {
      hasBusiness: false,
      businessId: null,
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
      softphoneEnabled: false,
      businessPhoneNumber: null,
      visibleChannelIds: [],
      calls: [],
      activeCall: null,
    };
  }

  const { businessId } = inboxContext;
  const [voiceInboxEnabled, smsInboxEnabled, visibleChannelIds, calls, clientConfig] =
    await Promise.all([
      isVoiceInboxVisible(businessId),
      isSmsInboxVisible(businessId),
      resolveVisibleChannelIds(businessId),
      getVoiceRepository().listCallLogsForInbox(businessId),
      getVoiceClientConfig(businessId),
    ]);

  const mappedCalls = calls.map(mapCallLogRow);
  const activeCall =
    activeCallId && activeCallId.length > 0
      ? await getVoiceCallDetail(businessId, activeCallId)
      : null;

  return {
    hasBusiness: true,
    businessId,
    voiceInboxEnabled,
    smsInboxEnabled,
    softphoneEnabled: clientConfig.enabled,
    businessPhoneNumber: clientConfig.phoneNumber,
    visibleChannelIds,
    calls: mappedCalls,
    activeCall,
  };
}

export async function getVoiceInboxCalls(
  businessId: string,
): Promise<VoiceInboxCallListItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const calls = await getVoiceRepository().listCallLogsForInbox(businessId);
  return calls.map(mapCallLogRow);
}

export async function getVoiceCallDetail(
  businessId: string,
  callLogId: string,
): Promise<VoiceCallDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const repo = getVoiceRepository();
  const row = await repo.findCallLogById(businessId, callLogId);

  if (!row) {
    return null;
  }

  let turns: VoiceCallSessionTurn[] = [];
  let turnCount = 0;

  if (row.external_call_id) {
    const session = await repo.findSessionByCallSid(row.external_call_id);

    if (session) {
      turns = (session.turns as VoiceCallSessionTurn[]) ?? [];
      turnCount = session.turn_count;
    }
  }

  const events = await repo.listCallEvents(businessId, callLogId);

  return {
    ...mapCallLogRow(row),
    turns,
    turnCount,
    hasRecording: Boolean(row.recording_url?.trim()),
    events: events.map(mapCallEventRow),
  };
}

export async function resolveInboundCallContactId(
  businessId: string,
  phoneNumber: string,
): Promise<string | null> {
  if (!hasSupabaseEnv() || !phoneNumber.trim()) {
    return null;
  }

  const conversationRepo = getConversationRepository();
  return conversationRepo.findContactIdByPhone(businessId, phoneNumber);
}

export async function markVoiceCallCompleted(input: {
  callSid: string;
  aiHandled?: boolean;
}): Promise<void> {
  if (!hasSupabaseEnv() || !input.callSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (!existing) {
    return;
  }

  if (existing.status === "completed" && existing.duration_seconds != null) {
    return;
  }

  const endedAt = new Date();
  const createdAt = new Date(existing.created_at);
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - createdAt.getTime()) / 1000),
  );

  await repo.updateCallLog(existing.id, {
    status: "completed",
    endedAt: endedAt.toISOString(),
    durationSeconds,
    aiHandled: input.aiHandled ?? true,
  });

  void syncVoiceCallToConversation({
    businessId: existing.business_id,
    callSid: input.callSid,
  }).catch((error) => {
    console.warn(
      "[voice-inbox] conversation sync failed",
      error instanceof Error ? error.message : "unknown",
    );
  });
}

function mapTwilioCallStatus(callStatus: string): string {
  switch (callStatus) {
    case "queued":
    case "ringing":
      return "ringing";
    case "in-progress":
      return "active";
    case "completed":
      return "completed";
    case "busy":
    case "no-answer":
    case "failed":
    case "canceled":
      return "missed";
    default:
      return callStatus;
  }
}

const POST_CALL_JOB_TYPES: VoicePostCallJobType[] = [
  "transcribe",
  "summarize",
  "extract_actions",
  "sync_crm",
  "booking",
];

export async function handleTwilioCallStatusUpdate(input: {
  businessId: string;
  callSid: string;
  callStatus: string;
  callDuration?: string | null;
  direction?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const repo = getVoiceRepository();
  const mappedStatus = mapTwilioCallStatus(input.callStatus);
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (!existing) {
    return;
  }

  if (existing.business_id !== input.businessId) {
    console.warn(
      "[voice-inbox] ignored status update for mismatched business",
      JSON.stringify({
        expectedBusinessId: existing.business_id,
        receivedBusinessId: input.businessId,
        callSid: input.callSid,
      }),
    );
    return;
  }

  await guardAiOutboundOnMissedStatus({
    businessId: input.businessId,
    callSid: input.callSid,
    callStatus: input.callStatus,
  });

  const parsedDuration = input.callDuration
    ? Number.parseInt(input.callDuration, 10)
    : null;
  const durationSeconds =
    parsedDuration != null && Number.isFinite(parsedDuration)
      ? Math.max(0, parsedDuration)
      : undefined;

  const patch: Parameters<typeof repo.updateCallLog>[1] = {
    status: mappedStatus,
  };

  if (mappedStatus === "completed" || mappedStatus === "missed") {
    patch.endedAt = new Date().toISOString();

    if (durationSeconds != null) {
      patch.durationSeconds = durationSeconds;
    }
  }

  await repo.updateCallLog(existing.id, patch);

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: existing.id,
    callSid: input.callSid,
    eventType: "call.status",
    actorType: "twilio",
    payload: {
      rawStatus: input.callStatus,
      status: mappedStatus,
      durationSeconds: durationSeconds ?? null,
      direction: input.direction ?? null,
      from: input.from ?? null,
      to: input.to ?? null,
    },
  });

  if (mappedStatus === "completed" || mappedStatus === "missed") {
    void syncVoiceCallToConversation({
      businessId: input.businessId,
      callSid: input.callSid,
    }).catch((error) => {
      console.warn(
        "[voice-inbox] conversation sync failed",
        error instanceof Error ? error.message : "unknown",
      );
    });

    const enqueueResults = await Promise.allSettled(
      POST_CALL_JOB_TYPES.map((jobType) =>
        repo.enqueuePostCallJob({
          businessId: input.businessId,
          callLogId: existing.id,
          jobType,
          payload: {
            callSid: input.callSid,
            status: mappedStatus,
            durationSeconds: durationSeconds ?? null,
          },
        }),
      ),
    );

    enqueueResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const jobType = POST_CALL_JOB_TYPES[index];
        const error = result.reason;
        console.warn(
          "[voice-inbox] post-call job enqueue failed",
          JSON.stringify({
            callSid: input.callSid,
            jobType,
            error: error instanceof Error ? error.message : "unknown",
          }),
        );
      }
    });

    if (enqueueResults.some((result) => result.status === "fulfilled")) {
      dispatchVoicePostCallWorker("enqueue");
    }
  }
}

export async function handleTwilioCustomerLegStatusUpdate(input: {
  businessId: string;
  parentCallSid: string;
  callSid: string;
  callStatus: string;
}): Promise<void> {
  if (!hasSupabaseEnv() || !input.parentCallSid.trim() || !input.callSid.trim()) {
    return;
  }

  const terminalStatuses = new Set([
    "busy",
    "no-answer",
    "failed",
    "canceled",
    "completed",
  ]);

  if (!terminalStatuses.has(input.callStatus)) {
    return;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.parentCallSid);

  if (callLog && callLog.business_id !== input.businessId) {
    console.warn(
      "[voice-inbox] ignored customer leg update for mismatched business",
      JSON.stringify({
        expectedBusinessId: callLog.business_id,
        receivedBusinessId: input.businessId,
        parentCallSid: input.parentCallSid,
      }),
    );
    return;
  }

  if (callLog && isActiveVoiceCallStatus(callLog.status)) {
    const mappedStatus =
      input.callStatus === "completed" && callLog.status === "ringing"
        ? "missed"
        : mapTwilioCallStatus(input.callStatus);

    await repo.updateCallLog(callLog.id, {
      status: mappedStatus,
      endedAt: new Date().toISOString(),
    });

    await repo.insertCallEvent({
      businessId: input.businessId,
      callLogId: callLog.id,
      callSid: input.callSid,
      eventType: "call.customer_leg_ended",
      actorType: "twilio",
      payload: {
        parentCallSid: input.parentCallSid,
        rawStatus: input.callStatus,
        status: mappedStatus,
      },
    });
  }

  await cancelOutboundVoiceCall({
    businessId: input.businessId,
    parentCallSid: input.parentCallSid,
    customerCallSid: input.callSid,
    reason: "operator_hangup",
  });
}

export async function handleTwilioConferenceEvent(input: {
  businessId: string;
  parentCallSid: string;
  participantCallSid?: string | null;
  conferenceSid?: string | null;
  conferenceName?: string | null;
  eventName?: string | null;
  participantLabel?: string | null;
  muted?: string | null;
  hold?: string | null;
  rawPayload?: Record<string, string>;
}): Promise<void> {
  if (!hasSupabaseEnv() || !input.parentCallSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.parentCallSid);

  if (!callLog) {
    return;
  }

  if (callLog.business_id !== input.businessId) {
    console.warn(
      "[voice-inbox] ignored conference event for mismatched business",
      JSON.stringify({
        expectedBusinessId: callLog.business_id,
        receivedBusinessId: input.businessId,
        parentCallSid: input.parentCallSid,
      }),
    );
    return;
  }

  const eventName = input.eventName?.trim() || "unknown";
  const activeEvents = new Set([
    "start",
    "join",
    "conference-start",
    "participant-join",
    "speaker",
  ]);
  const completedEvents = new Set(["end", "conference-end"]);

  if (activeEvents.has(eventName) && callLog.status !== "active") {
    await repo.updateCallLog(callLog.id, { status: "active" });
  }

  if (completedEvents.has(eventName) && callLog.status !== "completed") {
    await repo.updateCallLog(callLog.id, {
      status: "completed",
      endedAt: new Date().toISOString(),
    });
  }

  const leaveEvents = new Set(["leave", "participant-leave"]);

  if (leaveEvents.has(eventName) && input.participantLabel === "operator") {
    await cancelOutboundVoiceCall({
      businessId: input.businessId,
      parentCallSid: input.parentCallSid,
      reason: "operator_hangup",
    });
  }

  if (
    leaveEvents.has(eventName) &&
    input.participantLabel === "customer" &&
    callLog.status !== "completed"
  ) {
    await completeOperatorCallAfterCustomerLeave({
      businessId: input.businessId,
      parentCallSid: input.parentCallSid,
    });
  }

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: callLog.id,
    callSid: input.participantCallSid ?? input.parentCallSid,
    eventType: `conference.${eventName}`,
    actorType: "twilio",
    payload: {
      parentCallSid: input.parentCallSid,
      participantCallSid: input.participantCallSid ?? null,
      conferenceSid: input.conferenceSid ?? null,
      conferenceName: input.conferenceName ?? null,
      participantLabel: input.participantLabel ?? null,
      muted: input.muted ?? null,
      hold: input.hold ?? null,
      raw: input.rawPayload ?? {},
    },
  });
}

export async function markInboundCallAiFallback(
  businessId: string,
  callSid: string,
): Promise<void> {
  if (!hasSupabaseEnv() || !callSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(callSid);

  if (!callLog || callLog.business_id !== businessId) {
    return;
  }

  await repo.updateCallLog(callLog.id, {
    callMode: "handoff",
    aiHandled: true,
    humanHandled: false,
    handoffAt: new Date().toISOString(),
  });

  await repo.insertCallEvent({
    businessId,
    callLogId: callLog.id,
    callSid,
    eventType: "call.ai_fallback",
    actorType: "system",
    payload: {
      reason: "operator_no_answer",
    },
  });
}

export async function recordClientOutboundVoiceCall(input: {
  businessId: string;
  phoneNumber: string;
  callSid: string;
  contactId?: string | null;
}): Promise<{ callLogId: string | null }> {
  if (!hasSupabaseEnv() || !input.callSid.trim()) {
    return { callLogId: null };
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (existing) {
    if (existing.business_id !== input.businessId) {
      console.warn(
        "[voice-inbox] ignored browser outbound call for mismatched business",
        JSON.stringify({
          expectedBusinessId: existing.business_id,
          receivedBusinessId: input.businessId,
          callSid: input.callSid,
        }),
      );
      return { callLogId: null };
    }

    return { callLogId: existing.id };
  }

  await repo.insertCallLog({
    businessId: input.businessId,
    contactId: input.contactId ?? null,
    direction: "outbound",
    phoneNumber: input.phoneNumber,
    status: "ringing",
    provider: "twilio",
    externalCallId: input.callSid,
    triggerReason: "browser_call",
    callMode: "human",
    humanHandled: true,
  });

  const created = await repo.findCallLogByExternalCallId(input.callSid);

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: created?.id ?? null,
    callSid: input.callSid,
    eventType: "call.created",
    actorType: "operator",
    payload: {
      direction: "outbound",
      phoneNumber: input.phoneNumber,
      callMode: "human",
      triggerReason: "browser_call",
    },
  });

  return { callLogId: created?.id ?? null };
}

export async function syncVoiceCallToConversation(input: {
  businessId: string;
  callSid: string;
}): Promise<string | null> {
  if (!hasSupabaseEnv() || !input.callSid.trim()) {
    return null;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.callSid);

  if (!callLog) {
    return null;
  }

  if (callLog.business_id !== input.businessId) {
    console.warn(
      "[voice-inbox] ignored conversation sync for mismatched business",
      JSON.stringify({
        expectedBusinessId: callLog.business_id,
        receivedBusinessId: input.businessId,
        callSid: input.callSid,
      }),
    );
    return null;
  }

  if (callLog.conversation_id) {
    return callLog.conversation_id;
  }

  const session = await repo.findSessionByCallSid(input.callSid);
  const turns = (session?.turns as VoiceCallSessionTurn[]) ?? [];

  if (turns.length === 0) {
    return null;
  }

  let contactId = callLog.contact_id;

  if (!contactId && callLog.phone_number) {
    contactId = await getConversationRepository().findContactIdByPhone(
      input.businessId,
      callLog.phone_number,
    );
  }

  if (!contactId) {
    return null;
  }

  const conversationId = await getConversationRepository().resolveForInboundContact(
    input.businessId,
    contactId,
    "voice",
  );

  if (!conversationId) {
    return null;
  }

  const admin = createAdminClient();
  const messageRepo = getMessageRepository(admin);

  for (const [index, turn] of turns.entries()) {
    const externalMessageId = `voice:${input.callSid}:${index}`;

    const existing = await messageRepo.findByExternalId(
      "voice",
      externalMessageId,
    );

    if (existing) {
      continue;
    }

    const inserted = await messageRepo.insert({
      conversationId,
      channel: "voice",
      senderType: turn.role === "assistant" ? "ai" : "client",
      content: turn.content,
      aiGenerated: turn.role === "assistant",
      externalMessageId,
    });

    await updateConversationLastMessageFromInsert(admin, {
      conversationId,
      content: inserted.content,
      channel: "voice",
      senderType: inserted.sender_type,
      aiGenerated: inserted.ai_generated,
      createdAt: inserted.sent_at,
    });
  }

  await repo.updateCallLog(callLog.id, {
    conversationId,
    contactId,
  });

  return conversationId;
}
