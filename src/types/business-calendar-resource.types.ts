import { z } from "zod";

import type { WeeklySchedule } from "@/lib/calendar/weekly-schedule";

export const CALENDAR_RESOURCE_TYPES = [
  "room",
  "table",
  "staff",
  "chair",
  "service",
  "other",
] as const;

export type CalendarResourceType = (typeof CALENDAR_RESOURCE_TYPES)[number];

export const BUSINESS_TYPES = [
  "generic",
  "salon",
  "barbershop",
  "clinic",
  "dentist",
  "restaurant",
  "hotel",
  "auto_service",
  "spa",
  "gym",
  "veterinary",
  "photography",
  "tutoring",
  "legal",
  "real_estate",
  "coworking",
  "pet_grooming",
  "yoga_studio",
  "cleaning",
  "event_venue",
] as const;

export type BusinessBookingType = (typeof BUSINESS_TYPES)[number];

export const calendarResourceExtractionSchema = z.object({
  businessType: z.enum(BUSINESS_TYPES),
  businessTypeLabel: z.string().trim().min(1).max(80),
  operatingHoursNote: z.string().trim().max(500).optional(),
  resources: z
    .array(
      z.object({
        resourceType: z.enum(CALENDAR_RESOURCE_TYPES),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(300).optional(),
        capacity: z.number().int().min(1).max(100).optional(),
        durationMinutes: z.number().int().min(5).max(480).optional(),
      }),
    )
    .min(1)
    .max(60),
});

export type CalendarResourceExtraction = z.infer<
  typeof calendarResourceExtractionSchema
>;

export type BusinessCalendarResource = {
  id: string;
  businessId: string;
  resourceType: CalendarResourceType;
  name: string;
  description: string;
  capacity: number;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
  source: string;
  createdAt: string;
};

export type BusinessBookingSetup = {
  businessId: string;
  businessType: BusinessBookingType;
  businessTypeLabel: string;
  operatingHoursNote: string;
  generatedFromKnowledgeAt: string | null;
  bookingTimezone: string;
  slotBufferMinutes: number;
  advanceBookingDays: number;
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  bookingPageTitle: string;
  slotDurationMinutes: number;
  bookingPagePublished: boolean;
  weeklySchedule: WeeklySchedule;
};
