import "server-only";

import {
  hashDeviceFingerprint,
  parseUserAgentDeviceLabel,
} from "@/lib/email/parse-user-agent";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordUserLoginDevice(input: {
  userId: string;
  userAgent: string;
  ipAddress?: string | null;
}): Promise<{ isNewDevice: boolean; deviceLabel: string }> {
  const deviceLabel = parseUserAgentDeviceLabel(input.userAgent);
  const deviceFingerprint = hashDeviceFingerprint(input.userAgent);

  if (!hasSupabaseEnv()) {
    return { isNewDevice: false, deviceLabel };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("user_auth_devices")
    .select("id")
    .eq("user_id", input.userId)
    .eq("device_fingerprint", deviceFingerprint)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("user_auth_devices")
      .update({
        device_label: deviceLabel,
        user_agent: input.userAgent.slice(0, 512),
        last_ip: input.ipAddress?.slice(0, 64) ?? null,
        last_seen_at: now,
      })
      .eq("id", existing.id);

    return { isNewDevice: false, deviceLabel };
  }

  const { error } = await admin.from("user_auth_devices").insert({
    user_id: input.userId,
    device_fingerprint: deviceFingerprint,
    device_label: deviceLabel,
    user_agent: input.userAgent.slice(0, 512),
    last_ip: input.ipAddress?.slice(0, 64) ?? null,
    first_seen_at: now,
    last_seen_at: now,
  });

  if (error) {
    console.error("[auth-device] failed to record device", error.message);
    return { isNewDevice: false, deviceLabel };
  }

  return { isNewDevice: true, deviceLabel };
}
