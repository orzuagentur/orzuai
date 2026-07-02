import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PlatformAccountStatus = "active" | "suspended" | "readonly";

export type PlatformBusinessFeature =
  | "ai"
  | "voice"
  | "sms"
  | "automations"
  | "outbound_ai";

export type PlatformBusinessControls = {
  businessId: string;
  accountStatus: PlatformAccountStatus;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  automationsEnabled: boolean;
  outboundAiEnabled: boolean;
};

export class PlatformBusinessAccessError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PlatformBusinessAccessError";
  }
}

const DEFAULT_CONTROLS: Omit<PlatformBusinessControls, "businessId"> = {
  accountStatus: "active",
  aiEnabled: true,
  voiceEnabled: true,
  smsEnabled: true,
  automationsEnabled: true,
  outboundAiEnabled: true,
};

async function loadPlatformBusinessControls(
  businessId: string,
  supabase: SupabaseClient<Database>,
): Promise<PlatformBusinessControls> {
  const { data } = await supabase
    .from("platform_business_controls")
    .select(
      "business_id, account_status, ai_enabled, voice_enabled, sms_enabled, automations_enabled, outbound_ai_enabled",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return { businessId, ...DEFAULT_CONTROLS };
  }

  return {
    businessId,
    accountStatus: (data.account_status as PlatformAccountStatus) ?? "active",
    aiEnabled: Boolean(data.ai_enabled),
    voiceEnabled: Boolean(data.voice_enabled),
    smsEnabled: Boolean(data.sms_enabled),
    automationsEnabled: Boolean(data.automations_enabled),
    outboundAiEnabled: Boolean(data.outbound_ai_enabled),
  };
}

export const getPlatformBusinessControls = cache(
  async (businessId: string): Promise<PlatformBusinessControls> => {
    const supabase = await createClient();
    return loadPlatformBusinessControls(businessId, supabase);
  },
);

export async function getPlatformBusinessControlsAdmin(
  businessId: string,
): Promise<PlatformBusinessControls> {
  return loadPlatformBusinessControls(businessId, createAdminClient());
}

export async function assertPlatformBusinessAllowed(
  businessId: string,
  feature?: PlatformBusinessFeature,
): Promise<PlatformBusinessControls> {
  const controls = await getPlatformBusinessControlsAdmin(businessId);

  if (controls.accountStatus === "suspended") {
    throw new PlatformBusinessAccessError(
      "account_suspended",
      "Business account is suspended.",
    );
  }

  if (controls.accountStatus === "readonly") {
    throw new PlatformBusinessAccessError(
      "account_readonly",
      "Business account is read-only.",
    );
  }

  if (feature === "ai" && !controls.aiEnabled) {
    throw new PlatformBusinessAccessError("ai_disabled", "AI is disabled for this business.");
  }

  if (feature === "voice" && !controls.voiceEnabled) {
    throw new PlatformBusinessAccessError(
      "voice_disabled",
      "Voice is disabled for this business.",
    );
  }

  if (feature === "sms" && !controls.smsEnabled) {
    throw new PlatformBusinessAccessError("sms_disabled", "SMS is disabled for this business.");
  }

  if (feature === "automations" && !controls.automationsEnabled) {
    throw new PlatformBusinessAccessError(
      "automations_disabled",
      "Automations are disabled for this business.",
    );
  }

  if (feature === "outbound_ai" && !controls.outboundAiEnabled) {
    throw new PlatformBusinessAccessError(
      "outbound_ai_disabled",
      "Outbound AI is disabled for this business.",
    );
  }

  return controls;
}

export async function isPlatformFeatureAllowed(
  businessId: string,
  feature?: PlatformBusinessFeature,
): Promise<boolean> {
  try {
    await assertPlatformBusinessAllowed(businessId, feature);
    return true;
  } catch {
    return false;
  }
}

export async function isBusinessSuspended(businessId: string): Promise<boolean> {
  const controls = await getPlatformBusinessControlsAdmin(businessId);
  return controls.accountStatus === "suspended";
}
