"use server";

import { completeTeamMemberOnboarding } from "@/services/team-invite.service";
import { requireUser } from "@/services/auth.service";

export async function completeTeamOnboardingAction(): Promise<{
  success: boolean;
}> {
  const user = await requireUser();
  const result = await completeTeamMemberOnboarding(user.id);

  return { success: result.success };
}
