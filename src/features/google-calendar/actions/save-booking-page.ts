"use server";

import {
  saveBookingPageForUser,
  type SaveBookingPageInput,
} from "@/features/google-calendar/save-booking-page.server";

export async function saveBookingPageAction(
  input: SaveBookingPageInput,
): Promise<{ success: boolean; message?: string }> {
  return saveBookingPageForUser(input);
}
