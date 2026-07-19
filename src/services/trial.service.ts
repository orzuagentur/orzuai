import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailTemplateActive } from "@/services/email-template-config.service";
import { sendTrialEndedEmail } from "@/services/email.service";

const TRIAL_DAYS = 3;

export function getTrialEndsAt(from = new Date()): string {
  const ends = new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return ends.toISOString();
}

export function isTrialStillActive(input: {
  status: string | null | undefined;
  trialEndsAt: string | null | undefined;
  now?: Date;
}): boolean {
  const status = input.status?.trim().toLowerCase() || "";
  if (status !== "trialing") return false;
  if (!input.trialEndsAt) return false;
  const ends = Date.parse(input.trialEndsAt);
  if (Number.isNaN(ends)) return false;
  return ends > (input.now ?? new Date()).getTime();
}

/**
 * Expire past-due trials, notify once by email, and lock AI until they subscribe.
 */
export async function expireDueTrials(): Promise<{
  expired: number;
  emailed: number;
}> {
  if (!hasSupabaseEnv()) {
    return { expired: 0, emailed: 0 };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: dueRows } = await admin
    .from("businesses")
    .select("id, user_id, trial_ends_at, trial_ended_email_sent_at")
    .eq("subscription_status", "trialing")
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", nowIso)
    .limit(100);

  if (!dueRows?.length) {
    return { expired: 0, emailed: 0 };
  }

  let expired = 0;
  let emailed = 0;
  const templateActive = await isEmailTemplateActive("trial_ended");

  for (const row of dueRows) {
    const { error } = await admin
      .from("businesses")
      .update({
        subscription_status: "expired",
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("subscription_status", "trialing");

    if (error) continue;
    expired += 1;

    if (row.trial_ended_email_sent_at || !templateActive) {
      continue;
    }

    const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
    const email = userData.user?.email;
    if (!email) continue;

    const sendResult = await sendTrialEndedEmail({
      to: email,
      userId: row.user_id,
      businessId: row.id,
    });

    if (sendResult.success) {
      await admin
        .from("businesses")
        .update({ trial_ended_email_sent_at: nowIso })
        .eq("id", row.id);
      emailed += 1;
    }
  }

  return { expired, emailed };
}
