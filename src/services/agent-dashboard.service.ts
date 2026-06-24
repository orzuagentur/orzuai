import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type {
  AgentActivityChannelStat,
  AgentActivityPoint,
  AgentActivityRangeDays,
  AgentDashboardStats,
  AgentRecentDialogue,
} from "@/types/agent-dashboard.types";
import { parseMediaMessage } from "@/utils/chat-media";

const MEDIA_AUDIO_MARKER = '%"kind":"audio"%';
const IN_CHUNK_SIZE = 80;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function mapDialogueStatus(input: {
  lastMessageSenderType: string | null;
  status: string;
}): AgentRecentDialogue["status"] {
  if (
    input.lastMessageSenderType === "client" ||
    input.status === "pending" ||
    input.status === "open"
  ) {
    return "waiting";
  }

  return "resolved";
}

async function loadBusinessConversationIds(
  businessId: string,
): Promise<Array<{ id: string; contact_id: string | null; channel: string }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, contact_id, channel")
    .eq("business_id", businessId);

  return (data ?? []).map((row) => ({
    id: row.id,
    contact_id: row.contact_id,
    channel: row.channel,
  }));
}

async function countAiMessages(
  conversationIds: string[],
  options?: { voiceOnly?: boolean },
): Promise<number> {
  if (conversationIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  let total = 0;

  for (const chunk of chunkArray(conversationIds, IN_CHUNK_SIZE)) {
    let query = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", chunk)
      .or("ai_generated.eq.true,sender_type.eq.ai");

    if (options?.voiceOnly) {
      query = query.ilike("content", MEDIA_AUDIO_MARKER);
    } else if (options?.voiceOnly === false) {
      query = query.not("content", "ilike", MEDIA_AUDIO_MARKER);
    }

    const { count } = await query;

    total += count ?? 0;
  }

  return total;
}

async function sumVoiceAiReplyMinutes(
  conversationIds: string[],
): Promise<number> {
  if (conversationIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  const pendingMessageIds: string[] = [];
  let totalSeconds = 0;

  for (const chunk of chunkArray(conversationIds, IN_CHUNK_SIZE)) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, content")
      .in("conversation_id", chunk)
      .or("ai_generated.eq.true,sender_type.eq.ai")
      .ilike("content", MEDIA_AUDIO_MARKER);

    for (const message of messages ?? []) {
      const { media } = parseMediaMessage(message.content ?? "");

      if (media?.durationSec && media.durationSec > 0) {
        totalSeconds += media.durationSec;
        continue;
      }

      pendingMessageIds.push(message.id);
    }
  }

  const resolvedMessageIds = new Set<string>();

  for (const chunk of chunkArray(pendingMessageIds, IN_CHUNK_SIZE)) {
    const { data: attachments } = await supabase
      .from("message_attachments")
      .select("message_id, duration_sec")
      .in("message_id", chunk);

    for (const attachment of attachments ?? []) {
      if (attachment.duration_sec && attachment.duration_sec > 0) {
        totalSeconds += attachment.duration_sec;
        resolvedMessageIds.add(attachment.message_id);
      }
    }
  }

  const unresolvedCount = pendingMessageIds.filter(
    (messageId) => !resolvedMessageIds.has(messageId),
  ).length;
  totalSeconds += unresolvedCount * 30;

  return Math.round(totalSeconds / 60);
}

async function countContactsServedByAi(
  conversations: Array<{ id: string; contact_id: string | null }>,
): Promise<number> {
  const conversationIds = conversations.map((row) => row.id);

  if (conversationIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  const servedConversationIds = new Set<string>();

  for (const chunk of chunkArray(conversationIds, IN_CHUNK_SIZE)) {
    const { data } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", chunk)
      .or("ai_generated.eq.true,sender_type.eq.ai");

    for (const row of data ?? []) {
      servedConversationIds.add(row.conversation_id);
    }
  }

  const contactIds = new Set<string>();

  for (const conversation of conversations) {
    if (
      conversation.contact_id &&
      servedConversationIds.has(conversation.id)
    ) {
      contactIds.add(conversation.contact_id);
    }
  }

  return contactIds.size;
}

async function sumVoiceCallMinutes(businessId: string): Promise<number> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("voice_call_sessions")
    .select("created_at, updated_at, turn_count")
    .eq("business_id", businessId);

  let totalSeconds = 0;

  for (const session of sessions ?? []) {
    const startedAt = Date.parse(session.created_at);
    const endedAt = Date.parse(session.updated_at);
    const durationSeconds = Math.max(0, (endedAt - startedAt) / 1000);

    if (durationSeconds >= 5) {
      totalSeconds += durationSeconds;
      continue;
    }

    if ((session.turn_count ?? 0) > 0) {
      totalSeconds += Math.max(30, (session.turn_count ?? 0) * 45);
    }
  }

  return Math.round(totalSeconds / 60);
}

export async function listAgentRecentDialogues(
  businessId: string,
  limit = 12,
): Promise<AgentRecentDialogue[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, channel, status, updated_at, last_message_preview, last_message_at, last_message_sender_type, contact:contacts(name)",
    )
    .eq("business_id", businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).flatMap((row) => {
    const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
    const contactName = contact?.name?.trim() || "Customer";

    return [
      {
        id: row.id,
        contactName,
        messagePreview: row.last_message_preview?.trim() || "No messages yet",
        channel: row.channel,
        updatedAt: row.last_message_at ?? row.updated_at,
        status: mapDialogueStatus({
          lastMessageSenderType: row.last_message_sender_type,
          status: row.status,
        }),
      },
    ];
  });
}

export async function getAgentDashboardStats(
  businessId: string,
): Promise<AgentDashboardStats> {
  if (!hasSupabaseEnv()) {
    return {
      aiTextReplies: 0,
      voiceAiReplies: 0,
      voiceAiReplyMinutes: 0,
      totalCallMinutes: 0,
      contactsServed: 0,
    };
  }

  const conversations = await loadBusinessConversationIds(businessId);
  const conversationIds = conversations.map((row) => row.id);

  const [voiceAiReplies, aiMessagesTotal, contactsServed, totalCallMinutes, voiceAiReplyMinutes] =
    await Promise.all([
      countAiMessages(conversationIds, { voiceOnly: true }),
      countAiMessages(conversationIds),
      countContactsServedByAi(conversations),
      sumVoiceCallMinutes(businessId),
      sumVoiceAiReplyMinutes(conversationIds),
    ]);

  const aiTextReplies = Math.max(0, aiMessagesTotal - voiceAiReplies);

  return {
    aiTextReplies,
    voiceAiReplies,
    voiceAiReplyMinutes,
    totalCallMinutes,
    contactsServed,
  };
}

type ActivityEvent = {
  timestamp: string;
  channel: string;
};

type MutableActivityBucket = {
  key: string;
  label: string;
  timeLabel: string;
  value: number;
  channelCounts: Record<string, number>;
};

function format24HourTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatHalfHourKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}T${format24HourTime(date)}`;
}

function getHalfHourKeyFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const rounded = new Date(date);
  rounded.setMinutes(date.getMinutes() < 30 ? 0 : 30, 0, 0);

  return formatHalfHourKey(rounded);
}

function createHalfHourlyBuckets(slotCount: number): MutableActivityBucket[] {
  const end = new Date();
  end.setSeconds(0, 0);
  end.setMinutes(end.getMinutes() >= 30 ? 30 : 0);

  return Array.from({ length: slotCount }, (_, index) => {
    const date = new Date(end);
    date.setMinutes(end.getMinutes() - (slotCount - 1 - index) * 30);

    return {
      key: formatHalfHourKey(date),
      label: format24HourTime(date),
      timeLabel: `${date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}, ${format24HourTime(date)}`,
      value: 0,
      channelCounts: {},
    };
  });
}

function createDailyBuckets(days: number): MutableActivityBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const safeDays = Math.max(1, Math.min(days, 90));

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (safeDays - 1 - index));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      timeLabel: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      value: 0,
      channelCounts: {},
    };
  });
}

function incrementBucketChannel(
  bucket: MutableActivityBucket,
  channel: string,
): void {
  bucket.value += 1;
  bucket.channelCounts[channel] = (bucket.channelCounts[channel] ?? 0) + 1;
}

function toActivityPoint(bucket: MutableActivityBucket): AgentActivityPoint {
  const channels: AgentActivityChannelStat[] = Object.entries(bucket.channelCounts)
    .map(([channel, count]) => ({ channel, count }))
    .sort((left, right) => right.count - left.count);

  return {
    key: bucket.key,
    label: bucket.label,
    timeLabel: bucket.timeLabel,
    value: bucket.value,
    channels,
  };
}

function aggregateActivityEvents(
  events: ActivityEvent[],
  days: AgentActivityRangeDays,
): AgentActivityPoint[] {
  const buckets =
    days === 1 ? createHalfHourlyBuckets(48) : createDailyBuckets(days);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const event of events) {
    const key =
      days === 1
        ? getHalfHourKeyFromTimestamp(event.timestamp)
        : event.timestamp.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (bucket) {
      incrementBucketChannel(bucket, event.channel);
    }
  }

  return buckets.map(toActivityPoint);
}

async function loadAiActivityEvents(
  businessId: string,
  sinceIso: string,
  conversations: Array<{ id: string; channel: string }>,
): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  const events: ActivityEvent[] = [];
  const channelByConversation = new Map(
    conversations.map((conversation) => [conversation.id, conversation.channel]),
  );
  const conversationIds = conversations.map((conversation) => conversation.id);

  for (const chunk of chunkArray(conversationIds, IN_CHUNK_SIZE)) {
    const { data: messages } = await supabase
      .from("messages")
      .select("created_at, conversation_id")
      .in("conversation_id", chunk)
      .or("ai_generated.eq.true,sender_type.eq.ai")
      .gte("created_at", sinceIso);

    for (const message of messages ?? []) {
      events.push({
        timestamp: message.created_at,
        channel: channelByConversation.get(message.conversation_id) ?? "unknown",
      });
    }
  }

  const { data: calls } = await supabase
    .from("voice_call_logs")
    .select("created_at")
    .eq("business_id", businessId)
    .gte("created_at", sinceIso);

  for (const call of calls ?? []) {
    events.push({
      timestamp: call.created_at,
      channel: "phone",
    });
  }

  return events;
}

export async function getAgentAiActivity(
  businessId: string,
  days: AgentActivityRangeDays,
): Promise<AgentActivityPoint[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const conversations = await loadBusinessConversationIds(businessId);
  const since = new Date();

  if (days === 1) {
    const end = new Date();
    end.setSeconds(0, 0);
    end.setMinutes(end.getMinutes() >= 30 ? 30 : 0);
    since.setTime(end.getTime());
    since.setMinutes(since.getMinutes() - 47 * 30);
  } else {
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
  }

  const events = await loadAiActivityEvents(
    businessId,
    since.toISOString(),
    conversations,
  );

  return aggregateActivityEvents(events, days);
}
