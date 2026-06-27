import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { getConversationRepository } from "@/repositories/conversation.repository";
import {
  getVoiceRepository,
  type VoiceCallLogInboxRow,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";
import type { InboxBusinessContext } from "@/services/chat.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import { getTwilioConnection } from "@/services/twilio-integration.service";
import { getVoiceClientConfig } from "@/services/voice-client.service";
import {
  getActiveMessagingChannelIds,
} from "@/features/integrations";
import type {
  VoiceCallDetail,
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
    createdAt: row.created_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    aiHandled: row.ai_handled,
    contactId: row.contact_id,
    contactName: row.contacts?.name ?? null,
    externalCallId: row.external_call_id,
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

export async function getVoiceInboxPageData(
  inboxContext?: InboxBusinessContext | null,
  activeCallId?: string | null,
): Promise<VoiceInboxPageData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      businessId: null,
      voiceInboxEnabled: false,
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
      softphoneEnabled: false,
      businessPhoneNumber: null,
      visibleChannelIds: [],
      calls: [],
      activeCall: null,
    };
  }

  const { businessId } = inboxContext;
  const [voiceInboxEnabled, visibleChannelIds, calls, clientConfig] =
    await Promise.all([
      isVoiceInboxVisible(businessId),
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
    softphoneEnabled: clientConfig.enabled,
    businessPhoneNumber: clientConfig.phoneNumber,
    visibleChannelIds,
    calls: mappedCalls,
    activeCall,
  };
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

  return {
    ...mapCallLogRow(row),
    turns,
    turnCount,
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
}

export async function recordClientOutboundVoiceCall(input: {
  businessId: string;
  phoneNumber: string;
  callSid: string;
  contactId?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv() || !input.callSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (existing) {
    return;
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
  });
}
