import "server-only";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getDripDelayDays,
  ONBOARDING_DRIP_SCHEDULE,
  type OnboardingDripDay,
} from "@/lib/email/drip-schedule";
import { getAppUrl, hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { renderGoogleWelcomeEmail } from "@/lib/email/templates/google-welcome-email";
import { renderOnboardingDripEmail } from "@/lib/email/templates/onboarding-drip-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOnboardingDripEmail } from "@/services/email.service";
import { getOnboardingProgressForSystem } from "@/services/onboarding.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_LOOKBACK_DAYS = 14;

function getDripDashboardUrl(dripDay: OnboardingDripDay): string {
  const base = getAppUrl();

  if (dripDay === 0) {
    return `${base}${DASHBOARD_ROUTES.onboarding}`;
  }

  if (dripDay === 1) {
    return `${base}${DASHBOARD_ROUTES.integrations}`;
  }

  if (dripDay === 2) {
    return `${base}${DASHBOARD_ROUTES.knowledgeBase}`;
  }

  if (dripDay === 3) {
    return `${base}${DASHBOARD_ROUTES.aiAssistant}`;
  }

  if (dripDay === 5) {
    return `${base}${DASHBOARD_ROUTES.automations}`;
  }

  return `${base}${DASHBOARD_ROUTES.analytics}`;
}

async function getPrimaryBusinessIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function hasRecentBusinessActivity(businessId: string): Promise<boolean> {
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ACTIVITY_LOOKBACK_DAYS * DAY_MS,
  ).toISOString();

  const { count, error } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", since);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

export async function shouldContinueOnboardingDrips(
  userId: string,
): Promise<boolean> {
  const businessId = await getPrimaryBusinessIdForUser(userId);

  if (!businessId) {
    return true;
  }

  const [progress, hasActivity] = await Promise.all([
    getOnboardingProgressForSystem(businessId),
    hasRecentBusinessActivity(businessId),
  ]);

  if (progress.isComplete) {
    return false;
  }

  if (hasActivity && progress.percentComplete >= 80) {
    return false;
  }

  return true;
}

async function pauseOnboardingDrips(userId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("onboarding_drip_emails")
    .update({ drip_paused_at: now })
    .eq("user_id", userId)
    .is("drip_paused_at", null);
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

  const shouldContinue = await shouldContinueOnboardingDrips(input.userId);

  if (!shouldContinue) {
    await pauseOnboardingDrips(input.userId);
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

export async function triggerGoogleWelcomeEmail(input: {
  userId: string;
  email: string;
  firstName?: string | null;
}): Promise<{ sent: boolean }> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return { sent: false };
  }

  const recorded = await recordDripSent(input.userId, input.email, 0);

  if (!recorded) {
    return { sent: false };
  }

  const { subject, html } = renderGoogleWelcomeEmail({
    dashboardUrl: `${getAppUrl()}${DASHBOARD_ROUTES.overview}`,
    firstName: input.firstName,
  });

  const result = await sendOnboardingDripEmail({
    to: input.email,
    subject,
    html,
    templateId: "google_welcome",
  });

  if (!result.success) {
    const admin = createAdminClient();
    await admin
      .from("onboarding_drip_emails")
      .delete()
      .eq("user_id", input.userId)
      .eq("drip_day", 0);

    return { sent: false };
  }

  return { sent: true };
}

type DripRunResult = {
  processed: number;
  sent: number;
  paused: number;
};

export async function runDueOnboardingDrips(): Promise<DripRunResult> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return { processed: 0, sent: 0, paused: 0 };
  }

  const admin = createAdminClient();
  const now = Date.now();
  let processed = 0;
  let sent = 0;
  let paused = 0;

  const { data: anchorRows } = await admin
    .from("onboarding_drip_emails")
    .select("user_id, email, sent_at, drip_paused_at")
    .eq("drip_day", 0)
    .is("drip_paused_at", null);

  for (const row of anchorRows ?? []) {
    const shouldContinue = await shouldContinueOnboardingDrips(row.user_id);

    if (!shouldContinue) {
      await pauseOnboardingDrips(row.user_id);
      paused += 1;
      continue;
    }

    const elapsed = now - new Date(row.sent_at).getTime();
    const elapsedDays = elapsed / DAY_MS;

    for (const schedule of ONBOARDING_DRIP_SCHEDULE) {
      if (schedule.day === 0) {
        continue;
      }

      if (elapsedDays < getDripDelayDays(schedule.day)) {
        continue;
      }

      processed += 1;
      const result = await sendOnboardingDripIfDue({
        userId: row.user_id,
        email: row.email,
        dripDay: schedule.day,
      });

      if (result.sent) {
        sent += 1;
      }
    }
  }

  return { processed, sent, paused };
}

export async function hasOnboardingDripAnchor(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("onboarding_drip_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("drip_day", 0)
    .maybeSingle();

  return Boolean(data?.id);
}
