"use server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { dismissAiHumanRequestForBusiness } from "@/services/ai-human-request.service";
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

  const removed = await dismissAiHumanRequestForBusiness({
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
