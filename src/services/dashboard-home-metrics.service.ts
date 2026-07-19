import "server-only";

import { periodToDays } from "@/features/dashboard/metric-cards";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardCardMetricValues,
  DashboardCardPeriod,
} from "@/types/dashboard-home.types";

const EMPTY_VALUES: DashboardCardMetricValues = {
  newMessages: 0,
  totalMessages: 0,
  aiResponses: 0,
  newContacts: 0,
  allContacts: 0,
  qualifiedContacts: 0,
  newOrders: 0,
  inProgressOrders: 0,
  doneOrders: 0,
  openDeals: 0,
  wonDeals: 0,
  lostDeals: 0,
};

function sinceIsoForPeriod(period: DashboardCardPeriod): string | null {
  const days = periodToDays(period);
  if (days == null) return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString();
}

function countRows(count: number | null | undefined): number {
  return count ?? 0;
}

export async function getDashboardCardMetricValues(
  businessId: string,
  period: DashboardCardPeriod = "week",
): Promise<DashboardCardMetricValues> {
  if (!hasSupabaseEnv()) {
    return EMPTY_VALUES;
  }

  const supabase = await createClient();
  const sinceIso = sinceIsoForPeriod(period);

  let messagesQuery = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("hidden_for_business", false);

  let aiMessagesQuery = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("hidden_for_business", false)
    .eq("ai_generated", true);

  let newContactsQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  const allContactsQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  const qualifiedQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("pipeline_stage", "qualified");

  let newOrdersQuery = supabase
    .from("crm_orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "new");

  let inProgressOrdersQuery = supabase
    .from("crm_orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "in_progress");

  let doneOrdersQuery = supabase
    .from("crm_orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "done");

  const openDealsQuery = supabase
    .from("crm_deals")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "open");

  let wonDealsQuery = supabase
    .from("crm_deals")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "won");

  let lostDealsQuery = supabase
    .from("crm_deals")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "lost");

  if (sinceIso) {
    messagesQuery = messagesQuery.gte("created_at", sinceIso);
    aiMessagesQuery = aiMessagesQuery.gte("created_at", sinceIso);
    newContactsQuery = newContactsQuery.gte("created_at", sinceIso);
    newOrdersQuery = newOrdersQuery.gte("created_at", sinceIso);
    inProgressOrdersQuery = inProgressOrdersQuery.gte("updated_at", sinceIso);
    doneOrdersQuery = doneOrdersQuery.gte("updated_at", sinceIso);
    wonDealsQuery = wonDealsQuery.gte("updated_at", sinceIso);
    lostDealsQuery = lostDealsQuery.gte("updated_at", sinceIso);
  }

  const [
    messagesResult,
    aiMessagesResult,
    newContactsResult,
    allContactsResult,
    qualifiedResult,
    newOrdersResult,
    inProgressOrdersResult,
    doneOrdersResult,
    openDealsResult,
    wonDealsResult,
    lostDealsResult,
    channelAnalyticsResult,
    openContactsFallback,
    wonContactsFallback,
    lostContactsFallback,
  ] = await Promise.all([
    messagesQuery,
    aiMessagesQuery,
    newContactsQuery,
    allContactsQuery,
    qualifiedQuery,
    newOrdersQuery,
    inProgressOrdersQuery,
    doneOrdersQuery,
    openDealsQuery,
    wonDealsQuery,
    lostDealsQuery,
    supabase
      .from("channel_analytics")
      .select("total_messages")
      .eq("business_id", businessId),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .not("pipeline_stage", "in", "(won,lost)"),
    (() => {
      let query = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("pipeline_stage", "won");
      if (sinceIso) query = query.gte("updated_at", sinceIso);
      return query;
    })(),
    (() => {
      let query = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("pipeline_stage", "lost");
      if (sinceIso) query = query.gte("updated_at", sinceIso);
      return query;
    })(),
  ]);

  const messageCount = countRows(messagesResult.count);
  const aiCount = countRows(aiMessagesResult.count);
  const channelTotalMessages = (channelAnalyticsResult.data ?? []).reduce(
    (sum, row) => sum + (row.total_messages ?? 0),
    0,
  );

  const openFromDeals = countRows(openDealsResult.count);
  const wonFromDeals = countRows(wonDealsResult.count);
  const lostFromDeals = countRows(lostDealsResult.count);
  const dealsTableEmpty = openFromDeals + wonFromDeals + lostFromDeals === 0;

  return {
    newMessages: messageCount,
    totalMessages: period === "all" ? channelTotalMessages : messageCount,
    aiResponses: aiCount,
    newContacts: countRows(newContactsResult.count),
    allContacts: countRows(allContactsResult.count),
    qualifiedContacts: countRows(qualifiedResult.count),
    newOrders: countRows(newOrdersResult.count),
    inProgressOrders: countRows(inProgressOrdersResult.count),
    doneOrders: countRows(doneOrdersResult.count),
    openDeals: dealsTableEmpty
      ? countRows(openContactsFallback.count)
      : openFromDeals,
    wonDeals: dealsTableEmpty
      ? countRows(wonContactsFallback.count)
      : wonFromDeals,
    lostDeals: dealsTableEmpty
      ? countRows(lostContactsFallback.count)
      : lostFromDeals,
  };
}
