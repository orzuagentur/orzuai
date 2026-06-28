import "server-only";

import { z } from "zod";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { slugifyBookingPageTitle } from "@/lib/calendar/booking-page-slug";
import { parseWeeklySchedule, validateWeeklySchedule } from "@/lib/calendar/weekly-schedule";
import { parseBookingFormFields, type BookingFormField } from "@/lib/calendar/booking-form-fields";
import { saveBookingPage } from "@/services/booking-pages.service";
import {
  saveBusinessCalendarResources,
  type SaveCalendarResourceInput,
} from "@/services/business-calendar-resources.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  BUSINESS_TYPES,
  CALENDAR_RESOURCE_TYPES,
} from "@/types/business-calendar-resource.types";

const daySchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const resourceSchema = z.object({
  id: z.string().uuid().optional(),
  resourceType: z.enum(CALENDAR_RESOURCE_TYPES),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional(),
  capacity: z.number().int().min(1).max(100),
  durationMinutes: z.number().int().min(5).max(480),
  active: z.boolean().optional(),
});

const formFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["first_name", "last_name", "email", "phone", "text", "textarea", "number"]),
  required: z.boolean(),
  system: z.boolean().optional(),
});

const bookingPageInputSchema = z
  .object({
    pageId: z.string().uuid().optional(),
    slug: z.string().trim().max(64).optional(),
    bookingPageTitle: z.string().trim().min(1).max(120),
    slotDurationMinutes: z.number().int().min(5).max(480),
    bookingTimezone: z.string().trim().min(1).max(80),
    weeklySchedule: z.record(z.string(), daySchema),
    bookingPagePublished: z.boolean(),
    businessType: z.enum(BUSINESS_TYPES),
    businessTypeLabel: z.string().trim().min(1).max(80),
    slotBufferMinutes: z.number().int().min(0).max(120),
    advanceBookingDays: z.number().int().min(1).max(90),
    resources: z.array(resourceSchema).min(1).max(60),
    formFields: z.array(formFieldSchema).min(1).max(30),
  })
  .superRefine((data, ctx) => {
    const schedule = parseWeeklySchedule(data.weeklySchedule);
    const validation = validateWeeklySchedule(schedule);

    if (!validation.valid) {
      ctx.addIssue({
        code: "custom",
        message: validation.message ?? ORZUX_CALENDAR_MESSAGES.bookingPageInvalidTime,
        path: ["weeklySchedule"],
      });
    }

    if (data.slug && slugifyBookingPageTitle(data.slug) !== data.slug.replace(/[^a-z0-9-]/g, "")) {
      ctx.addIssue({
        code: "custom",
        message: "Slug may only contain lowercase letters, numbers, and hyphens.",
        path: ["slug"],
      });
    }
  });

export type SaveBookingPageInput = z.infer<typeof bookingPageInputSchema>;

export async function saveBookingPageForUser(
  input: SaveBookingPageInput,
): Promise<{ success: boolean; message?: string; pageId?: string; slug?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed };
  }

  const parsed = bookingPageInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed,
    };
  }

  const weeklySchedule = parseWeeklySchedule(parsed.data.weeklySchedule);

  const pageResult = await saveBookingPage({
    businessId: business.id,
    pageId: parsed.data.pageId,
    title: parsed.data.bookingPageTitle,
    slug: parsed.data.slug
      ? slugifyBookingPageTitle(parsed.data.slug)
      : undefined,
    businessType: parsed.data.businessType,
    businessTypeLabel: parsed.data.businessTypeLabel,
    slotDurationMinutes: parsed.data.slotDurationMinutes,
    slotBufferMinutes: parsed.data.slotBufferMinutes,
    advanceBookingDays: parsed.data.advanceBookingDays,
    bookingTimezone: parsed.data.bookingTimezone,
    weeklySchedule,
    formFields: parseBookingFormFields(parsed.data.formFields) as BookingFormField[],
    published: parsed.data.bookingPagePublished,
  });

  if (!pageResult.success || !pageResult.page) {
    return { success: false, message: pageResult.message };
  }

  const resources: SaveCalendarResourceInput[] = parsed.data.resources.map(
    (resource) => ({
      id: resource.id,
      resourceType: resource.resourceType,
      name: resource.name,
      description: resource.description,
      capacity: resource.capacity,
      durationMinutes: resource.durationMinutes,
      active: resource.active,
    }),
  );

  const resourcesResult = await saveBusinessCalendarResources(
    business.id,
    pageResult.page.id,
    resources,
  );

  if (!resourcesResult.success) {
    return resourcesResult;
  }

  return {
    success: true,
    pageId: pageResult.page.id,
    slug: pageResult.page.slug,
  };
}
