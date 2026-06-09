"use server";

import { getDashboardNavBadgeCounts } from "@/services/conversation-read.service";
import { getPrimaryBusiness } from "@/services/business.service";
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
  const business = await getPrimaryBusiness(user.id);

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

  const data = await getDashboardNavBadgeCounts(business.id);

  return {
    success: true as const,
    data,
  };
}
