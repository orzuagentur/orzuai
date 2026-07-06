"use server";

import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { deleteBusinessNotificationForBusiness } from "@/services/business-notifications.service";

export async function deleteBusinessNotificationAction(notificationId: string) {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false as const, message: "Business not found." };
  }

  try {
    await deleteBusinessNotificationForBusiness({
      businessId: business.id,
      notificationId,
    });

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete notification.",
    };
  }
}
