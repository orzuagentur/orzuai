"use server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { markCalendarNotificationsReadForBusiness } from "@/services/business-notifications.service";
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

  await markCalendarNotificationsReadForBusiness(business.id);

  return { success: true as const };
}
