"use server";

import { disconnectGoogleCalendar } from "@/services/google-calendar.service";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";

export async function disconnectGoogleCalendarAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  const result = await disconnectGoogleCalendar();

  if (result.success) {
    return { success: true, message: GOOGLE_CALENDAR_MESSAGES.disconnectSuccess };
  }

  return result;
}
