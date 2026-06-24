"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { markCalendarNotificationsRead } from "@/services/business-notifications.service";
import { requireUser } from "@/services/auth.service";

export async function markCalendarNotificationsReadAction() {
  if (!hasSupabaseEnv()) {
    return { success: true as const };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return { success: false as const };
  }

  const admin = createAdminClient();

  await markCalendarNotificationsRead({
    admin,
    businessId: business.id,
  });

  return { success: true as const };
}
