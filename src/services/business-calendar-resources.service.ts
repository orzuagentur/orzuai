import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BusinessCalendarResource,
  CalendarResourceType,
} from "@/types/business-calendar-resource.types";

export type SaveCalendarResourceInput = {
  id?: string;
  resourceType: CalendarResourceType;
  name: string;
  description?: string;
  capacity: number;
  durationMinutes: number;
  active?: boolean;
};

function mapResourceRow(row: {
  id: string;
  business_id: string;
  resource_type: string;
  name: string;
  description: string;
  capacity: number;
  duration_minutes: number;
  sort_order: number;
  active: boolean;
  source: string;
  created_at: string;
}): BusinessCalendarResource {
  return {
    id: row.id,
    businessId: row.business_id,
    resourceType: row.resource_type as BusinessCalendarResource["resourceType"],
    name: row.name,
    description: row.description,
    capacity: row.capacity,
    durationMinutes: row.duration_minutes,
    sortOrder: row.sort_order,
    active: row.active,
    source: row.source,
    createdAt: row.created_at,
  };
}

function revalidateCalendarPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.calendar);
  revalidatePath(DASHBOARD_ROUTES.calendarBooking);
  revalidatePath(`${DASHBOARD_ROUTES.calendarBooking}/new`);
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

export async function listAllBusinessCalendarResources(
  businessId: string,
  bookingPageId?: string,
): Promise<BusinessCalendarResource[]> {
  const admin = createAdminClient();
  let query = admin
    .from("business_calendar_resources")
    .select(
      "id, business_id, resource_type, name, description, capacity, duration_minutes, sort_order, active, source, created_at",
    )
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (bookingPageId) {
    query = query.eq("booking_page_id", bookingPageId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapResourceRow);
}

export async function saveBusinessCalendarResources(
  businessId: string,
  bookingPageId: string,
  resources: SaveCalendarResourceInput[],
): Promise<{ success: boolean; message?: string }> {
  const admin = createAdminClient();
  const trimmed = resources
    .map((resource, index) => ({
      ...resource,
      name: resource.name.trim(),
      description: resource.description?.trim() ?? "",
      sortOrder: index,
    }))
    .filter((resource) => resource.name.length > 0);

  if (trimmed.length === 0) {
    return { success: false, message: "Add at least one bookable resource." };
  }

  const { error: deleteError } = await admin
    .from("business_calendar_resources")
    .delete()
    .eq("business_id", businessId)
    .eq("booking_page_id", bookingPageId);

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }

  const rows = trimmed.map((resource) => ({
    business_id: businessId,
    booking_page_id: bookingPageId,
    resource_type: resource.resourceType,
    name: resource.name,
    description: resource.description,
    capacity: resource.capacity,
    duration_minutes: resource.durationMinutes,
    sort_order: resource.sortOrder,
    active: resource.active ?? true,
    source: "manual",
  }));

  const { error: insertError } = await admin
    .from("business_calendar_resources")
    .insert(rows);

  if (insertError) {
    return { success: false, message: insertError.message };
  }

  revalidateCalendarPaths();
  return { success: true };
}

export async function listPublicBookingPageResources(
  bookingPageId: string,
): Promise<BusinessCalendarResource[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("business_calendar_resources")
    .select(
      "id, business_id, resource_type, name, description, capacity, duration_minutes, sort_order, active, source, created_at",
    )
    .eq("booking_page_id", bookingPageId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapResourceRow);
}
