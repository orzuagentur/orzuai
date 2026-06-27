"use server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { listAiHumanRequestsForBusiness } from "@/services/ai-human-request.service";
import { requireUser } from "@/services/auth.service";

export async function fetchAiHumanRequestsAction() {
  if (!hasSupabaseEnv()) {
    return {
      success: true as const,
      data: [],
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      success: true as const,
      data: [],
    };
  }

  const data = await listAiHumanRequestsForBusiness(business.id);

  return {
    success: true as const,
    data,
  };
}
