"use server";

import { getAccessibleBusiness } from "@/services/business-access.service";
import { getDashboardNavBadgeCounts } from "@/services/conversation-read.service";
import { requireUser } from "@/services/auth.service";
import { hasSupabaseEnv } from "@/lib/env";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

export async function fetchNavBadgeCountsAction() {
  if (!hasSupabaseEnv()) {
    return {
      success: true as const,
      data: {
        inboxUnread: 0,
        crmUnread: 0,
        calendarAiUnread: 0,
        overdueTasks: 0,
        upcomingEvents: 0,
        unreadByChannel: createEmptyUnreadByChannel(),
      },
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      success: true as const,
      data: {
        inboxUnread: 0,
        crmUnread: 0,
        calendarAiUnread: 0,
        overdueTasks: 0,
        upcomingEvents: 0,
        unreadByChannel: createEmptyUnreadByChannel(),
      },
    };
  }

  const data = await getDashboardNavBadgeCounts(business.id, user.id);

  return {
    success: true as const,
    data,
  };
}
