import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ORIGIN } from "@/constants/app-origin";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  appendSlugSuffix,
  slugifyBookingPageTitle,
} from "@/lib/calendar/booking-page-slug";
import {
  parseWeeklySchedule,
  type WeeklySchedule,
} from "@/lib/calendar/weekly-schedule";
import {
  parseBookingFormFields,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  BookingPageRecord,
  PublicBookingPageView,
} from "@/types/booking-page.types";
import type { BusinessBookingType } from "@/types/business-calendar-resource.types";

function mapBookingPageRow(row: {
  id: string;
  business_id: string;
  slug: string;
  title: string;
  business_type: string;
  business_type_label: string;
  slot_duration_minutes: number;
  slot_buffer_minutes: number;
  advance_booking_days: number;
  booking_timezone: string;
  weekly_schedule: unknown;
  form_fields: unknown;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): BookingPageRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    slug: row.slug,
    title: row.title,
    businessType: row.business_type as BusinessBookingType,
    businessTypeLabel: row.business_type_label,
    slotDurationMinutes: row.slot_duration_minutes,
    slotBufferMinutes: row.slot_buffer_minutes,
    advanceBookingDays: row.advance_booking_days,
    bookingTimezone: row.booking_timezone,
    weeklySchedule: parseWeeklySchedule(row.weekly_schedule),
    formFields: parseBookingFormFields(row.form_fields),
    published: row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revalidateBookingPaths(slug?: string): void {
  revalidatePath(DASHBOARD_ROUTES.calendar);
  revalidatePath(DASHBOARD_ROUTES.calendarBooking);
  if (slug) {
    revalidatePath(`/book/${slug}`);
  }
}

export async function generateUniqueBookingPageSlug(input: {
  title: string;
  businessId: string;
  excludePageId?: string;
}): Promise<string> {
  const admin = createAdminClient();
  const base = slugifyBookingPageTitle(input.title);
  const businessSuffix = input.businessId.replace(/-/g, "").slice(0, 6);
  let candidate = appendSlugSuffix(base, businessSuffix);
  let attempt = 0;

  while (attempt < 20) {
    let query = admin
      .from("booking_pages")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (input.excludePageId) {
      query = query.neq("id", input.excludePageId);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      return candidate;
    }

    attempt += 1;
    candidate = appendSlugSuffix(base, `${businessSuffix}${attempt}`);
  }

  return appendSlugSuffix(base, crypto.randomUUID().replace(/-/g, "").slice(0, 8));
}

export async function listBookingPagesForBusiness(
  businessId: string,
): Promise<BookingPageRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_pages")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapBookingPageRow);
}

export async function getBookingPageById(
  businessId: string,
  pageId: string,
): Promise<BookingPageRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_pages")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", pageId)
    .maybeSingle();

  return data ? mapBookingPageRow(data) : null;
}

export async function getBookingPageByIdAdmin(
  pageId: string,
): Promise<BookingPageRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_pages")
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  return data ? mapBookingPageRow(data) : null;
}

export async function listPublishedBookingPagesForBusinessAdmin(
  businessId: string,
): Promise<BookingPageRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_pages")
    .select("*")
    .eq("business_id", businessId)
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapBookingPageRow);
}

export async function getPublishedBookingPageBySlug(
  slug: string,
): Promise<PublicBookingPageView | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const { data: businessRow } = await admin
    .from("businesses")
    .select("business_name")
    .eq("id", data.business_id)
    .maybeSingle();

  const page = mapBookingPageRow(data);

  return {
    ...page,
    businessName: businessRow?.business_name ?? "Business",
    publicUrl: `${APP_ORIGIN}/book/${page.slug}`,
  };
}

export async function saveBookingPage(input: {
  businessId: string;
  pageId?: string;
  title: string;
  slug?: string;
  businessType: BusinessBookingType;
  businessTypeLabel: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  advanceBookingDays: number;
  bookingTimezone: string;
  weeklySchedule: WeeklySchedule;
  formFields: BookingFormField[];
  published: boolean;
}): Promise<{ success: boolean; message?: string; page?: BookingPageRecord }> {
  const admin = createAdminClient();
  const slug =
    input.slug?.trim() ||
    (await generateUniqueBookingPageSlug({
      title: input.title,
      businessId: input.businessId,
      excludePageId: input.pageId,
    }));

  const payload = {
    business_id: input.businessId,
    slug,
    title: input.title.trim(),
    business_type: input.businessType,
    business_type_label: input.businessTypeLabel,
    slot_duration_minutes: input.slotDurationMinutes,
    slot_buffer_minutes: input.slotBufferMinutes,
    advance_booking_days: input.advanceBookingDays,
    booking_timezone: input.bookingTimezone,
    weekly_schedule: input.weeklySchedule,
    form_fields: input.formFields,
    published: input.published,
    updated_at: new Date().toISOString(),
  };

  if (input.pageId) {
    const { data, error } = await admin
      .from("booking_pages")
      .update(payload)
      .eq("id", input.pageId)
      .eq("business_id", input.businessId)
      .select("*")
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    revalidateBookingPaths(data.slug);
    return { success: true, page: mapBookingPageRow(data) };
  }

  const { count } = await admin
    .from("booking_pages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", input.businessId);

  const { data, error } = await admin
    .from("booking_pages")
    .insert({
      ...payload,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateBookingPaths(data.slug);
  return { success: true, page: mapBookingPageRow(data) };
}

export async function deleteBookingPage(
  businessId: string,
  pageId: string,
): Promise<{ success: boolean; message?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("booking_pages")
    .select("slug")
    .eq("business_id", businessId)
    .eq("id", pageId)
    .maybeSingle();

  const { error } = await admin
    .from("booking_pages")
    .delete()
    .eq("business_id", businessId)
    .eq("id", pageId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateBookingPaths(existing?.slug);
  return { success: true };
}

export function getBookingPagePublicPath(slug: string): string {
  return `/book/${slug}`;
}
