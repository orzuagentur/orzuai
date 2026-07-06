import "server-only";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getTwilioCountryPricing,
  TWILIO_COUNTRY_PRICING,
} from "@/features/twilio/country-pricing";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  addTwilioNumberToStripeSubscription,
  removeTwilioNumberFromStripeSubscription,
} from "@/services/stripe.service";
import type { TwilioNumberBillingItem } from "@/types/billing.types";
import type { MessagingChannel } from "@/types/database.types";

import { buildPeriodActivity } from "@/utils/dashboard";

type TwilioNumberSubscriptionInsert = {
  business_id: string;
  phone_number: string;
  phone_sid: string;
  country_code: string;
  monthly_price_cents: number;
  stripe_subscription_item_id: string | null;
  status: string;
  canceled_at: string | null;
};

type TwilioNumberSubscriptionRow = TwilioNumberSubscriptionInsert & {
  id: string;
  created_at: string;
};

export async function listTwilioNumberSubscriptions(
  businessId: string,
): Promise<TwilioNumberBillingItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("twilio_number_subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (data as TwilioNumberSubscriptionRow[] | null)?.map((row) => {
    const pricing = getTwilioCountryPricing(row.country_code);

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      phoneSid: row.phone_sid,
      countryCode: row.country_code,
      countryLabel: pricing?.label ?? row.country_code,
      monthlyPriceCents: row.monthly_price_cents,
      status: row.status === "canceled" ? "canceled" : "active",
      createdAt: row.created_at,
    };
  }) ?? [];
}

export async function registerTwilioNumberBilling(input: {
  businessId: string;
  phoneNumber: string;
  phoneSid: string;
  countryCode: string;
  monthlyPriceCents: number;
  stripeSubscriptionId: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database not configured." };
  }

  const stripeResult = await addTwilioNumberToStripeSubscription({
    businessId: input.businessId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    phoneNumber: input.phoneNumber,
    phoneSid: input.phoneSid,
    countryCode: input.countryCode,
    monthlyPriceCents: input.monthlyPriceCents,
  });

  if (!stripeResult.success) {
    return { success: false, message: stripeResult.message };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("twilio_number_subscriptions").upsert(
    {
      business_id: input.businessId,
      phone_number: input.phoneNumber,
      phone_sid: input.phoneSid,
      country_code: input.countryCode.toUpperCase(),
      monthly_price_cents: input.monthlyPriceCents,
      stripe_subscription_item_id: stripeResult.subscriptionItemId,
      status: "active",
      canceled_at: null,
    },
    { onConflict: "business_id,phone_sid" },
  );

  if (error) {
    await removeTwilioNumberFromStripeSubscription(stripeResult.subscriptionItemId);
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function cancelTwilioNumberBilling(input: {
  businessId: string;
  phoneSid: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("twilio_number_subscriptions")
    .select("stripe_subscription_item_id")
    .eq("business_id", input.businessId)
    .eq("phone_sid", input.phoneSid)
    .eq("status", "active")
    .maybeSingle();

  if (data?.stripe_subscription_item_id) {
    await removeTwilioNumberFromStripeSubscription(
      data.stripe_subscription_item_id,
    );
  }

  await admin
    .from("twilio_number_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("business_id", input.businessId)
    .eq("phone_sid", input.phoneSid);
}

export function listTwilioCountryPricing() {
  return TWILIO_COUNTRY_PRICING;
}

export async function buildDailyUsageSeries(input: {
  businessId: string;
  table: "voice_call_logs" | "messages";
  days?: number;
  channel?: string;
  valueField?: "count" | "duration_seconds";
}): Promise<ReturnType<typeof buildPeriodActivity>> {
  const days = input.days ?? 30;

  if (!hasSupabaseEnv()) {
    return buildPeriodActivity([], days);
  }

  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  if (input.table === "voice_call_logs") {
    const { data } = await supabase
      .from("voice_call_logs")
      .select("created_at, duration_seconds")
      .eq("business_id", input.businessId)
      .gte("created_at", start.toISOString());

    if (input.valueField === "duration_seconds") {
      const buckets = new Map<string, number>();

      for (const row of data ?? []) {
        const day = row.created_at.slice(0, 10);
        buckets.set(day, (buckets.get(day) ?? 0) + (row.duration_seconds ?? 0));
      }

      const timestamps = [...buckets.entries()].flatMap(([day, seconds]) =>
        Array.from({ length: Math.min(seconds, 100) }, () => `${day}T12:00:00.000Z`),
      );

      return buildPeriodActivity(timestamps, days);
    }

    return buildPeriodActivity(
      (data ?? []).map((row) => row.created_at),
      days,
    );
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", input.businessId);

  let conversationIds = conversations?.map((row) => row.id) ?? [];

  if (input.channel) {
    const { data: filtered } = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("channel", input.channel as MessagingChannel);

    conversationIds = filtered?.map((row) => row.id) ?? [];
  }

  if (conversationIds.length === 0) {
    return buildPeriodActivity([], days);
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("created_at")
    .in("conversation_id", conversationIds)
    .gte("created_at", start.toISOString());

  return buildPeriodActivity(
    (messages ?? []).map((row) => row.created_at),
    days,
  );
}

export async function getOwnedBusinessBillingContext() {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return null;
  }

  return { user, business };
}

export { DASHBOARD_ROUTES };
