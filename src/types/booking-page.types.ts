import type { WeeklySchedule } from "@/lib/calendar/weekly-schedule";
import type { BookingFormField } from "@/lib/calendar/booking-form-fields";
import type { BusinessBookingType } from "@/types/business-calendar-resource.types";

export type BookingPageRecord = {
  id: string;
  businessId: string;
  slug: string;
  title: string;
  businessType: BusinessBookingType;
  businessTypeLabel: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  advanceBookingDays: number;
  bookingTimezone: string;
  weeklySchedule: WeeklySchedule;
  formFields: BookingFormField[];
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicBookingPageView = BookingPageRecord & {
  businessName: string;
  publicUrl: string;
};

export type PublicBookingSlot = {
  start: string;
  end: string;
  label: string;
};
