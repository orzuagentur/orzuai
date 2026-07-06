import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildDailyUsageSeries,
  getOwnedBusinessBillingContext,
  listTwilioNumberSubscriptions,
} from "@/services/billing-twilio.service";
import {
  buildTwilioConnectUrlForBusiness,
  getTwilioConnectConfig,
  getTwilioConnection,
} from "@/services/twilio-integration.service";
import type { TwilioBillingData } from "@/types/billing.types";

export async function getTwilioBillingPageData(): Promise<TwilioBillingData> {
  const empty: TwilioBillingData = {
    isConnected: false,
    connectionStatus: "disconnected",
    accountFriendlyName: null,
    activePhoneNumber: null,
    numbers: [],
    voiceMinutesLast30Days: 0,
    smsCountLast30Days: 0,
    callVolume: [],
    smsVolume: [],
    monthlyNumberSpendCents: 0,
    connectUrl: "/api/integrations/twilio/connect",
    isConnectConfigured: getTwilioConnectConfig().isConfigured,
  };

  const ctx = await getOwnedBusinessBillingContext();

  if (!ctx || !hasSupabaseEnv()) {
    return empty;
  }

  const businessId = ctx.business.id;
  const [connection, numbers, callVolume, smsVolume] = await Promise.all([
    getTwilioConnection(businessId),
    listTwilioNumberSubscriptions(businessId),
    buildDailyUsageSeries({
      businessId,
      table: "voice_call_logs",
      days: 30,
    }),
    buildDailyUsageSeries({
      businessId,
      table: "messages",
      days: 30,
      channel: "sms",
    }),
  ]);

  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: callLogs }, smsCount] = await Promise.all([
    supabase
      .from("voice_call_logs")
      .select("duration_seconds")
      .eq("business_id", businessId)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    (async () => {
      const { data: smsConversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", businessId)
        .eq("channel", "sms");

      const ids = smsConversations?.map((row) => row.id) ?? [];

      if (ids.length === 0) {
        return 0;
      }

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .gte("created_at", thirtyDaysAgo.toISOString());

      return count ?? 0;
    })(),
  ]);

  const voiceSeconds = (callLogs ?? []).reduce(
    (sum, row) => sum + (row.duration_seconds ?? 0),
    0,
  );

  const activeNumbers = numbers.filter((entry) => entry.status === "active");
  const monthlyNumberSpendCents = activeNumbers.reduce(
    (sum, entry) => sum + entry.monthlyPriceCents,
    0,
  );

  let connectUrl = empty.connectUrl;

  try {
    connectUrl = await buildTwilioConnectUrlForBusiness(businessId);
  } catch {
    connectUrl = empty.connectUrl;
  }

  return {
    isConnected: connection?.status === "connected",
    connectionStatus: connection?.status ?? "disconnected",
    accountFriendlyName: connection?.accountFriendlyName ?? null,
    activePhoneNumber: connection?.phoneNumber ?? null,
    numbers: activeNumbers,
    voiceMinutesLast30Days: Math.round(voiceSeconds / 60),
    smsCountLast30Days: smsCount,
    callVolume,
    smsVolume,
    monthlyNumberSpendCents,
    connectUrl,
    isConnectConfigured: getTwilioConnectConfig().isConfigured,
  };
}
