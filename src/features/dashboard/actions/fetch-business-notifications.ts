"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import {
  countUnreadBusinessNotifications,
  listBusinessNotifications,
} from "@/services/business-notifications.service";
import { requireUser } from "@/services/auth.service";

export async function fetchBusinessNotificationsAction() {
  if (!hasSupabaseEnv()) {
    return {
      success: true as const,
      data: [],
      unreadCount: 0,
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      success: true as const,
      data: [],
      unreadCount: 0,
    };
  }

  const admin = createAdminClient();
  const [data, unreadCount] = await Promise.all([
    listBusinessNotifications(admin, business.id),
    countUnreadBusinessNotifications(admin, business.id),
  ]);

  return {
    success: true as const,
    data,
    unreadCount,
  };
}
