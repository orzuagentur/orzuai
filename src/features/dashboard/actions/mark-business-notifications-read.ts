"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { markBusinessNotificationsRead } from "@/services/business-notifications.service";
import { requireUser } from "@/services/auth.service";

export async function markBusinessNotificationsReadAction(
  notificationIds?: string[],
) {
  if (!hasSupabaseEnv()) {
    return {
      success: true as const,
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      success: false as const,
      error: "Business not found.",
    };
  }

  const admin = createAdminClient();

  await markBusinessNotificationsRead({
    admin,
    businessId: business.id,
    notificationIds,
  });

  return {
    success: true as const,
  };
}
