import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

function revalidateVoiceInboxPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(DASHBOARD_ROUTES.chatsVoice);
}

export async function deleteVoicePhoneHistory(
  phoneNumber: string,
): Promise<
  | { success: true; deletedCount: number }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const phone = phoneNumber.trim();

  if (!phone || phone.replace(/\D/g, "").length < 8) {
    return { success: false, message: "Enter a valid phone number." };
  }

  try {
    const deletedCount = await getVoiceRepository().deleteCallLogsByPhoneNumber(
      business.id,
      phone,
    );

    revalidateVoiceInboxPaths();
    return { success: true, deletedCount };
  } catch {
    return { success: false, message: "Unable to remove call history." };
  }
}
