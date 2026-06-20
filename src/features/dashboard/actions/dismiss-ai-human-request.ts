"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { dismissAiHumanRequest } from "@/services/ai-human-request.service";
import { requireUser } from "@/services/auth.service";

export async function dismissAiHumanRequestAction(requestId: string) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: "Database is not configured.",
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
  const removed = await dismissAiHumanRequest({
    admin,
    businessId: business.id,
    requestId,
  });

  if (!removed) {
    return {
      success: false as const,
      error: "Request not found.",
    };
  }

  return {
    success: true as const,
  };
}
