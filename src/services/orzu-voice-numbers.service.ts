import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";

export type OrzuVoiceNumberStatus =
  | "provisioning"
  | "active"
  | "releasing"
  | "released";

export type OrzuVoiceNumber = {
  id: string;
  businessId: string;
  phoneNumber: string;
  phoneSid: string;
  countryCode: string;
  forwardToE164: string | null;
  forwardingWizardCompletedAt: string | null;
  monthlyPriceCents: number;
  stripeSubscriptionItemId: string | null;
  billingStatus: "active" | "canceled";
  status: OrzuVoiceNumberStatus;
  voiceUrl: string | null;
  smsUrl: string | null;
  provisionedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrzuVoiceNumberRow = {
  id: string;
  business_id: string;
  phone_number: string;
  phone_sid: string;
  country_code: string;
  forward_to_e164: string | null;
  forwarding_wizard_completed_at: string | null;
  monthly_price_cents: number;
  stripe_subscription_item_id: string | null;
  billing_status: "active" | "canceled";
  status: OrzuVoiceNumberStatus;
  voice_url: string | null;
  sms_url: string | null;
  provisioned_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: OrzuVoiceNumberRow): OrzuVoiceNumber {
  return {
    id: row.id,
    businessId: row.business_id,
    phoneNumber: row.phone_number,
    phoneSid: row.phone_sid,
    countryCode: row.country_code,
    forwardToE164: row.forward_to_e164,
    forwardingWizardCompletedAt: row.forwarding_wizard_completed_at,
    monthlyPriceCents: row.monthly_price_cents,
    stripeSubscriptionItemId: row.stripe_subscription_item_id,
    billingStatus: row.billing_status,
    status: row.status,
    voiceUrl: row.voice_url,
    smsUrl: row.sms_url,
    provisionedAt: row.provisioned_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getActiveOrzuVoiceNumber(
  businessId: string,
): Promise<OrzuVoiceNumber | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orzu_voice_numbers")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as OrzuVoiceNumberRow);
}

export async function upsertActiveOrzuVoiceNumber(input: {
  businessId: string;
  phoneNumber: string;
  phoneSid: string;
  countryCode: string;
  monthlyPriceCents: number;
  stripeSubscriptionItemId?: string | null;
  voiceUrl?: string | null;
  smsUrl?: string | null;
}): Promise<OrzuVoiceNumber> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const existing = await getActiveOrzuVoiceNumber(input.businessId);

  if (existing) {
    const { data, error } = await admin
      .from("orzu_voice_numbers")
      .update({
        phone_number: input.phoneNumber,
        phone_sid: input.phoneSid,
        country_code: input.countryCode,
        monthly_price_cents: input.monthlyPriceCents,
        stripe_subscription_item_id:
          input.stripeSubscriptionItemId ?? existing.stripeSubscriptionItemId,
        voice_url: input.voiceUrl ?? existing.voiceUrl,
        sms_url: input.smsUrl ?? existing.smsUrl,
        status: "active",
        billing_status: "active",
        provisioned_at: existing.provisionedAt ?? now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update OrzuX voice number.");
    }

    return mapRow(data as OrzuVoiceNumberRow);
  }

  const { data, error } = await admin
    .from("orzu_voice_numbers")
    .insert({
      business_id: input.businessId,
      phone_number: input.phoneNumber,
      phone_sid: input.phoneSid,
      country_code: input.countryCode,
      monthly_price_cents: input.monthlyPriceCents,
      stripe_subscription_item_id: input.stripeSubscriptionItemId ?? null,
      voice_url: input.voiceUrl ?? null,
      sms_url: input.smsUrl ?? null,
      status: "active",
      billing_status: "active",
      provisioned_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create OrzuX voice number.");
  }

  return mapRow(data as OrzuVoiceNumberRow);
}

export async function saveOrzuVoiceForwardTo(input: {
  businessId: string;
  forwardToE164: string;
  markWizardComplete?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const forwardTo = input.forwardToE164.trim();

  if (!/^\+[1-9]\d{6,14}$/.test(forwardTo)) {
    return {
      success: false,
      message: "Use international format, e.g. +491701234567.",
    };
  }

  const active = await getActiveOrzuVoiceNumber(input.businessId);

  if (!active) {
    return { success: false, message: "No OrzuX number assigned yet." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("orzu_voice_numbers")
    .update({
      forward_to_e164: forwardTo,
      forwarding_wizard_completed_at: input.markWizardComplete === false ? null : now,
      updated_at: now,
    })
    .eq("id", active.id);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function releaseActiveOrzuVoiceNumber(
  businessId: string,
): Promise<void> {
  const active = await getActiveOrzuVoiceNumber(businessId);

  if (!active) {
    return;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("orzu_voice_numbers")
    .update({
      status: "released",
      billing_status: "canceled",
      released_at: now,
      updated_at: now,
    })
    .eq("id", active.id);
}
