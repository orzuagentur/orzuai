"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { listAiHumanRequests } from "@/services/ai-human-request.service";
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

  const admin = createAdminClient();
  const data = await listAiHumanRequests(admin, business.id);

  return {
    success: true as const,
    data,
  };
}
