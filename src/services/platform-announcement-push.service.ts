import "server-only";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPlatformAnnouncementPush } from "@/services/push-notifications.service";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  severity: string;
  target_audience: string;
  target_business_ids: string[] | null;
  is_active: boolean;
};

async function resolveAnnouncementBusinessIds(
  announcement: AnnouncementRow,
): Promise<string[]> {
  const admin = createAdminClient();

  if (announcement.target_audience === "business_ids") {
    return announcement.target_business_ids ?? [];
  }

  if (announcement.target_audience === "all") {
    const { data } = await admin.from("businesses").select("id");
    return (data ?? []).map((row) => row.id as string);
  }

  const { data } = await admin
    .from("businesses")
    .select("id")
    .eq("subscription_plan", announcement.target_audience);

  return (data ?? []).map((row) => row.id as string);
}

export async function broadcastPlatformAnnouncementPush(
  announcementId: string,
): Promise<{ businesses: number; sent: number; skipped: number }> {
  const admin = createAdminClient();

  const { data: announcement, error } = await admin
    .from("platform_announcements")
    .select("id, title, body, severity, target_audience, target_business_ids, is_active")
    .eq("id", announcementId)
    .maybeSingle();

  if (error || !announcement || !announcement.is_active) {
    return { businesses: 0, sent: 0, skipped: 0 };
  }

  const businessIds = await resolveAnnouncementBusinessIds(
    announcement as AnnouncementRow,
  );

  let sent = 0;
  let skipped = 0;

  for (const businessId of businessIds) {
    const result = await notifyPlatformAnnouncementPush({
      businessId,
      announcementId: announcement.id as string,
      title: announcement.title as string,
      body: announcement.body as string,
      severity: announcement.severity as string,
      url: `${getAppUrl()}${DASHBOARD_ROUTES.overview}`,
    });

    if (result.skipped) {
      skipped += 1;
    } else {
      sent += result.sent;
    }
  }

  return { businesses: businessIds.length, sent, skipped };
}
