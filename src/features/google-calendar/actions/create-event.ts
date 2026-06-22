"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import { createGoogleCalendarEventForBusiness } from "@/services/google-calendar.service";
import { z } from "zod";

const createEventSchema = z.object({
  summary: z.string().trim().min(1, "Title is required.").max(200),
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1),
  timeZone: z.string().min(1),
  description: z.string().max(2000).optional(),
});

export async function createCalendarEventAction(
  input: z.infer<typeof createEventSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = createEventSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? GOOGLE_CALENDAR_MESSAGES.eventCreateFailed,
    };
  }

  const result = await createGoogleCalendarEventForBusiness(parsed.data);

  if (result.success) {
    revalidatePath(DASHBOARD_ROUTES.calendar);
    return { success: true, message: GOOGLE_CALENDAR_MESSAGES.eventCreated };
  }

  return result;
}
