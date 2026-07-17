import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  ANALYTICS_CALL_SERIES_KEYS,
  type AnalyticsCallsChartPoint,
  type AnalyticsCallSeriesKey,
  type AnalyticsChartPoint,
  type AnalyticsChartRangeDays,
  type AnalyticsChartSegment,
  type AnalyticsSeriesMetric,
} from "@/types/analytics-chart.types";

const IN_CHUNK_SIZE = 80;

type MutableBucket = {
  key: string;
  label: string;
  timeLabel: string;
  value: number;
  segmentCounts: Record<string, number>;
};

type SeriesEvent = {
  timestamp: string;
  segmentId: string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getHalfHourKeyFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const minutes = date.getMinutes() < 30 ? 0 : 30;
  date.setMinutes(minutes, 0, 0);
  return date.toISOString();
}

function createHalfHourlyBuckets(count: number): MutableBucket[] {
  const now = new Date();
  now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - (count - 1 - index) * 30);

    return {
      key: date.toISOString(),
      label: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      timeLabel: date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      value: 0,
      segmentCounts: {},
    };
  });
}

function createDailyBuckets(days: number): MutableBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));

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
      segmentCounts: {},
    };
  });
}

function segmentLabel(metric: AnalyticsSeriesMetric, segmentId: string): string {
  if (metric === "deals") {
    if (segmentId === "won") return "Won";
    if (segmentId === "lost") return "Lost";
  }

  if (metric === "calls") {
    if (segmentId === "ai") return "AI calls";
    if (segmentId === "manager") return "Manager calls";
    if (segmentId === "general") return "All platform calls";
    if (segmentId === "inbound") return "Inbound";
    if (segmentId === "outbound") return "Outbound";
  }

  return segmentId.replace(/_/g, " ");
}

function toChartPoint(
  bucket: MutableBucket,
  metric: AnalyticsSeriesMetric,
): AnalyticsChartPoint {
  const segments: AnalyticsChartSegment[] = Object.entries(bucket.segmentCounts)
    .map(([id, count]) => ({
      id,
      label: segmentLabel(metric, id),
      count,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    key: bucket.key,
    label: bucket.label,
    timeLabel: bucket.timeLabel,
    value: bucket.value,
    segments,
  };
}

function aggregateEvents(
  events: SeriesEvent[],
  days: AnalyticsChartRangeDays,
  metric: AnalyticsSeriesMetric,
): AnalyticsChartPoint[] {
  const buckets =
    days === 1 ? createHalfHourlyBuckets(48) : createDailyBuckets(days);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const event of events) {
    const key =
      days === 1
        ? getHalfHourKeyFromTimestamp(event.timestamp)
        : event.timestamp.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (!bucket) {
      continue;
    }

    bucket.value += 1;
    bucket.segmentCounts[event.segmentId] =
      (bucket.segmentCounts[event.segmentId] ?? 0) + 1;
  }

  return buckets.map((bucket) => toChartPoint(bucket, metric));
}

function sinceIsoForDays(days: AnalyticsChartRangeDays): string {
  const since = new Date();

  if (days === 1) {
    since.setHours(since.getHours() - 24);
    return since.toISOString();
  }

  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  return since.toISOString();
}

async function loadMessageEvents(
  businessId: string,
  sinceIso: string,
): Promise<SeriesEvent[]> {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, channel")
    .eq("business_id", businessId);

  const channelByConversation = new Map(
    (conversations ?? []).map((row) => [row.id, row.channel ?? "unknown"]),
  );
  const conversationIds = (conversations ?? []).map((row) => row.id);
  const events: SeriesEvent[] = [];

  for (const chunk of chunkArray(conversationIds, IN_CHUNK_SIZE)) {
    const { data: messages } = await supabase
      .from("messages")
      .select("created_at, conversation_id")
      .in("conversation_id", chunk)
      .gte("created_at", sinceIso);

    for (const message of messages ?? []) {
      events.push({
        timestamp: message.created_at,
        segmentId: channelByConversation.get(message.conversation_id) ?? "unknown",
      });
    }
  }

  return events;
}

async function loadClientEvents(
  businessId: string,
  sinceIso: string,
): Promise<SeriesEvent[]> {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("created_at, channel")
    .eq("business_id", businessId)
    .gte("created_at", sinceIso);

  return (contacts ?? []).map((contact) => ({
    timestamp: contact.created_at,
    segmentId: contact.channel ?? "unknown",
  }));
}

async function loadDealEvents(
  businessId: string,
  sinceIso: string,
): Promise<SeriesEvent[]> {
  const supabase = await createClient();
  const { data: deals } = await supabase
    .from("crm_deals")
    .select("updated_at, created_at, status")
    .eq("business_id", businessId)
    .in("status", ["won", "lost"])
    .gte("updated_at", sinceIso);

  if (deals && deals.length > 0) {
    return deals.map((deal) => ({
      timestamp: deal.updated_at ?? deal.created_at,
      segmentId: deal.status === "won" ? "won" : "lost",
    }));
  }

  // Fallback: contacts currently marked won/lost (no deal rows yet)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("created_at, last_message_at, pipeline_stage")
    .eq("business_id", businessId)
    .in("pipeline_stage", ["won", "lost"])
    .gte("created_at", sinceIso);

  return (contacts ?? []).map((contact) => ({
    timestamp: contact.last_message_at ?? contact.created_at,
    segmentId: contact.pipeline_stage === "won" ? "won" : "lost",
  }));
}

function emptyCallValues(): Record<AnalyticsCallSeriesKey, number> {
  return {
    ai: 0,
    manager: 0,
    general: 0,
    inbound: 0,
    outbound: 0,
  };
}

function callSeriesKeysForRow(row: {
  direction: string;
  call_mode: string;
  ai_handled: boolean;
  human_handled: boolean;
}): AnalyticsCallSeriesKey[] {
  const keys: AnalyticsCallSeriesKey[] = ["general"];

  if (row.direction === "inbound") {
    keys.push("inbound");
  } else if (row.direction === "outbound") {
    keys.push("outbound");
  }

  const isAi =
    row.call_mode === "ai" || (row.ai_handled && !row.human_handled);
  const isManager =
    row.call_mode === "human" || row.human_handled;

  if (isAi) {
    keys.push("ai");
  }
  if (isManager) {
    keys.push("manager");
  }

  return keys;
}

type MutableCallsBucket = {
  key: string;
  label: string;
  timeLabel: string;
  values: Record<AnalyticsCallSeriesKey, number>;
};

function createCallsBuckets(days: AnalyticsChartRangeDays): MutableCallsBucket[] {
  const base =
    days === 1 ? createHalfHourlyBuckets(48) : createDailyBuckets(days);

  return base.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    timeLabel: bucket.timeLabel,
    values: emptyCallValues(),
  }));
}

async function loadCallRows(
  businessId: string,
  sinceIso: string,
): Promise<
  Array<{
    created_at: string;
    direction: string;
    call_mode: string;
    ai_handled: boolean;
    human_handled: boolean;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_call_logs")
    .select("created_at, direction, call_mode, ai_handled, human_handled")
    .eq("business_id", businessId)
    .gte("created_at", sinceIso);

  return (data ?? []).map((row) => ({
    created_at: row.created_at,
    direction: row.direction,
    call_mode: row.call_mode,
    ai_handled: Boolean(row.ai_handled),
    human_handled: Boolean(row.human_handled),
  }));
}

export async function getAnalyticsCallsSeries(
  businessId: string,
  days: AnalyticsChartRangeDays,
): Promise<AnalyticsCallsChartPoint[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const sinceIso = sinceIsoForDays(days);
  const rows = await loadCallRows(businessId, sinceIso);
  const buckets = createCallsBuckets(days);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const row of rows) {
    const key =
      days === 1
        ? getHalfHourKeyFromTimestamp(row.created_at)
        : row.created_at.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (!bucket) {
      continue;
    }

    for (const seriesKey of callSeriesKeysForRow(row)) {
      bucket.values[seriesKey] += 1;
    }
  }

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    timeLabel: bucket.timeLabel,
    values: bucket.values,
  }));
}

export async function getAnalyticsSeries(
  businessId: string,
  metric: AnalyticsSeriesMetric,
  days: AnalyticsChartRangeDays,
): Promise<AnalyticsChartPoint[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  if (metric === "calls") {
    // Call charts use getAnalyticsCallsSeries; keep a total line for generic consumers.
    const calls = await getAnalyticsCallsSeries(businessId, days);
    return calls.map((point) => ({
      key: point.key,
      label: point.label,
      timeLabel: point.timeLabel,
      value: point.values.general,
      segments: ANALYTICS_CALL_SERIES_KEYS.filter((id) => id !== "general")
        .map((id) => ({
          id,
          label: segmentLabel("calls", id),
          count: point.values[id],
        }))
        .filter((segment) => segment.count > 0)
        .sort((left, right) => right.count - left.count),
    }));
  }

  const sinceIso = sinceIsoForDays(days);
  let events: SeriesEvent[] = [];

  if (metric === "messages") {
    events = await loadMessageEvents(businessId, sinceIso);
  } else if (metric === "clients") {
    events = await loadClientEvents(businessId, sinceIso);
  } else {
    events = await loadDealEvents(businessId, sinceIso);
  }

  return aggregateEvents(events, days, metric);
}
