import "server-only";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAppUrl, hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { renderOnboardingDripEmail } from "@/lib/email/templates/onboarding-drip-email";
import type { OnboardingDripDay } from "@/lib/email/templates/onboarding-drip-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOnboardingDripEmail } from "@/services/email.service";

const DAY_MS = 24 * 60 * 60 * 1000;

function getDripDashboardUrl(dripDay: OnboardingDripDay): string {
  const base = getAppUrl();

  if (dripDay === 0) {
    return `${base}${DASHBOARD_ROUTES.onboarding}`;
  }

  if (dripDay === 1) {
    return `${base}${DASHBOARD_ROUTES.integrations}`;
  }

  return `${base}${DASHBOARD_ROUTES.knowledgeBase}`;
}

async function recordDripSent(
  userId: string,
  email: string,
  dripDay: OnboardingDripDay,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("onboarding_drip_emails").insert({
    user_id: userId,
    email,
    drip_day: dripDay,
  });

  if (error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("duplicate") || normalized.includes("unique")) {
      return false;
    }

    throw new Error(error.message);
  }

  return true;
}

export async function sendOnboardingDripIfDue(input: {
  userId: string;
  email: string;
  dripDay: OnboardingDripDay;
  businessName?: string | null;
}): Promise<{ sent: boolean }> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return { sent: false };
  }

  const recorded = await recordDripSent(
    input.userId,
    input.email,
    input.dripDay,
  );

  if (!recorded) {
    return { sent: false };
  }

  const { subject, html } = renderOnboardingDripEmail({
    dripDay: input.dripDay,
    dashboardUrl: getDripDashboardUrl(input.dripDay),
    businessName: input.businessName,
  });

  const result = await sendOnboardingDripEmail({
    to: input.email,
    subject,
    html,
  });

  if (!result.success) {
    const admin = createAdminClient();
    await admin
      .from("onboarding_drip_emails")
      .delete()
      .eq("user_id", input.userId)
      .eq("drip_day", input.dripDay);

    return { sent: false };
  }

  return { sent: true };
}

export async function triggerOnboardingDripDay0(input: {
  userId: string;
  email: string;
  businessName?: string | null;
}): Promise<void> {
  await sendOnboardingDripIfDue({
    userId: input.userId,
    email: input.email,
    dripDay: 0,
    businessName: input.businessName,
  });
}

type DripRunResult = {
  processed: number;
  sent: number;
};

export async function runDueOnboardingDrips(): Promise<DripRunResult> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return { processed: 0, sent: 0 };
  }

  const admin = createAdminClient();
  const now = Date.now();
  let processed = 0;
  let sent = 0;

  const { data: day0Rows } = await admin
    .from("onboarding_drip_emails")
    .select("user_id, email, sent_at")
    .eq("drip_day", 0);

  for (const row of day0Rows ?? []) {
    const elapsed = now - new Date(row.sent_at).getTime();

    if (elapsed >= DAY_MS) {
      processed += 1;
      const result = await sendOnboardingDripIfDue({
        userId: row.user_id,
        email: row.email,
        dripDay: 1,
      });

      if (result.sent) {
        sent += 1;
      }
    }

    if (elapsed >= DAY_MS * 3) {
      processed += 1;
      const result = await sendOnboardingDripIfDue({
        userId: row.user_id,
        email: row.email,
        dripDay: 3,
      });

      if (result.sent) {
        sent += 1;
      }
    }
  }

  return { processed, sent };
}
