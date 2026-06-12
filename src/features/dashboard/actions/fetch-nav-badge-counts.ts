"use server";

import { getAccessibleBusiness } from "@/services/business-access.service";
import { getDashboardNavBadgeCounts } from "@/services/conversation-read.service";
import { requireUser } from "@/services/auth.service";
import { hasSupabaseEnv } from "@/lib/env";

export async function fetchNavBadgeCountsAction() {
  if (!hasSupabaseEnv()) {
    return {
      success: true as const,
      data: {
        inboxUnread: 0,
        crmUnread: 0,
        unreadByChannel: {
          whatsapp: 0,
          telegram: 0,
          instagram: 0,
          website_forms: 0,
        },
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
        unreadByChannel: {
          whatsapp: 0,
          telegram: 0,
          instagram: 0,
          website_forms: 0,
        },
      },
    };
  }

  const data = await getDashboardNavBadgeCounts(business.id, user.id);

  return {
    success: true as const,
    data,
  };
}
