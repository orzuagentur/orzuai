"use server";

import { z } from "zod";

import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import { saveBusinessBookingSettings } from "@/services/business-calendar-setup.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const schema = z.object({
  bookingTimezone: z.string().trim().min(1).max(80),
  slotBufferMinutes: z.number().int().min(0).max(120),
  advanceBookingDays: z.number().int().min(1).max(90),
  businessHoursEnabled: z.boolean(),
  businessHoursStart: z.string().trim().min(4).max(8),
  businessHoursEnd: z.string().trim().min(4).max(8),
});

export async function saveBookingSettingsAction(
  input: z.infer<typeof schema>,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: GOOGLE_CALENDAR_MESSAGES.noBusinessDescription };
  }

  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? GOOGLE_CALENDAR_MESSAGES.settingsSaveFailed,
    };
  }

  return saveBusinessBookingSettings(business.id, parsed.data);
}
