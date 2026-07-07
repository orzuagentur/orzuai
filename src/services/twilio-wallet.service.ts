import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_TOPUP_FEE_PERCENT = 5;

export type TwilioTopUpQuote = {
  creditCents: number;
  feeCents: number;
  chargedCents: number;
  feePercent: number;
};

export function getTwilioTopUpFeePercent(): number {
  const raw = process.env.TWILIO_TOPUP_PROCESSING_FEE_PERCENT?.trim();
  const parsed = raw ? Number.parseFloat(raw) : DEFAULT_TOPUP_FEE_PERCENT;

  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_TOPUP_FEE_PERCENT;
  }

  return Math.min(parsed, 25);
}

export function quoteTwilioTopUp(creditCents: number): TwilioTopUpQuote {
  const feePercent = getTwilioTopUpFeePercent();
  const feeCents = Math.max(0, Math.ceil((creditCents * feePercent) / 100));

  return {
    creditCents,
    feeCents,
    chargedCents: creditCents + feeCents,
    feePercent,
  };
}

export async function getTwilioWalletBalanceCents(
  businessId: string,
): Promise<number> {
  if (!hasSupabaseEnv()) {
    return 0;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("twilio_wallet_balance_cents")
    .eq("id", businessId)
    .maybeSingle();

  return Math.max(0, (data?.twilio_wallet_balance_cents as number | undefined) ?? 0);
}

export async function creditTwilioWallet(input: {
  businessId: string;
  creditCents: number;
  topUpId: string;
}): Promise<void> {
  if (!hasSupabaseEnv() || input.creditCents <= 0) {
    return;
  }

  const admin = createAdminClient();
  const currentBalance = await getTwilioWalletBalanceCents(input.businessId);

  await admin
    .from("businesses")
    .update({
      twilio_wallet_balance_cents: currentBalance + input.creditCents,
    })
    .eq("id", input.businessId);
}

export async function recordTwilioTopUpPayment(input: {
  businessId: string;
  creditCents: number;
  feeCents: number;
  chargedCents: number;
  stripePaymentIntentId: string;
}): Promise<{ success: true; topUpId: string } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  if (input.creditCents <= 0) {
    return { success: false, message: "Invalid credit amount." };
  }

  const paymentIntentId = input.stripePaymentIntentId.trim();

  if (!paymentIntentId) {
    return { success: false, message: "Missing Stripe payment intent." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "record_twilio_topup_credit" as never,
    {
      p_business_id: input.businessId,
      p_credit_cents: input.creditCents,
      p_fee_cents: Math.max(0, input.feeCents),
      p_charged_cents: Math.max(input.chargedCents, input.creditCents),
      p_payment_intent_id: paymentIntentId,
    } as never,
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, topUpId: String(data) };
}

export async function debitTwilioWallet(input: {
  businessId: string;
  amountCents: number;
  sourceType: string;
  sourceId?: string | null;
  description?: string | null;
}): Promise<{ success: true } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  if (input.amountCents <= 0) {
    return { success: false, message: "Invalid debit amount." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "debit_twilio_wallet_once" as never,
    {
      p_business_id: input.businessId,
      p_amount_cents: input.amountCents,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId ?? null,
      p_description: input.description ?? null,
    } as never,
  );

  if (error) {
    return { success: false, message: error.message };
  }

  const result = data as { success?: boolean; message?: string } | null;

  if (!result?.success) {
    return {
      success: false,
      message: result?.message ?? "Unable to debit Twilio balance.",
    };
  }

  return { success: true };
}
