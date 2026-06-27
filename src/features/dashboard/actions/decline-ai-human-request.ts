"use server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { declineAiHumanRequestForBusiness } from "@/services/ai-human-request.service";
import { requireUser } from "@/services/auth.service";

export async function declineAiHumanRequestAction(requestId: string) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: "Database is not configured.",
      customerNotified: false,
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      success: false as const,
      error: "Business not found.",
      customerNotified: false,
    };
  }

  const result = await declineAiHumanRequestForBusiness({
    businessId: business.id,
    requestId,
  });

  if (!result.success) {
    return {
      success: false as const,
      error: "Request not found.",
      customerNotified: false,
    };
  }

  return {
    success: true as const,
    customerNotified: result.customerNotified,
  };
}
