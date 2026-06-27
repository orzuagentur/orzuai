import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { mapKnowledgeEntry } from "@/utils/knowledge";
import { generateTextWithFallback } from "@/services/llm.service";
import { buildHeuristicCalendarExtraction } from "@/utils/calendar-heuristic";
import type {
  BusinessBookingSetup,
  BusinessCalendarResource,
  CalendarResourceExtraction,
} from "@/types/business-calendar-resource.types";
import { calendarResourceExtractionSchema } from "@/types/business-calendar-resource.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

function parseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

async function listKnowledgeEntriesForSetup(
  businessId: string,
): Promise<KnowledgeEntryData[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("knowledge_base")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map(mapKnowledgeEntry);
}

function buildKnowledgeContext(entries: KnowledgeEntryData[]): string {
  if (entries.length === 0) {
    return "No knowledge base entries yet.";
  }

  return entries
    .slice(0, 40)
    .map(
      (entry) =>
        `[${entry.category}] ${entry.title}\n${entry.content.trim().slice(0, 1200)}`,
    )
    .join("\n\n");
}

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
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

export async function listBusinessCalendarResources(
  businessId: string,
): Promise<BusinessCalendarResource[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("business_calendar_resources")
    .select(
      "id, business_id, resource_type, name, description, capacity, duration_minutes, sort_order, active, source, created_at",
    )
    .eq("business_id", businessId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapResourceRow);
}

export async function getBusinessBookingSetup(
  businessId: string,
): Promise<BusinessBookingSetup | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("business_booking_setup")
    .select(
      "business_id, business_type, business_type_label, operating_hours_note, generated_from_knowledge_at, booking_timezone, slot_buffer_minutes, advance_booking_days, business_hours_enabled, business_hours_start, business_hours_end, business_days",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    businessId: data.business_id,
    businessType: data.business_type as BusinessBookingSetup["businessType"],
    businessTypeLabel: data.business_type_label,
    operatingHoursNote: data.operating_hours_note,
    generatedFromKnowledgeAt: data.generated_from_knowledge_at,
    bookingTimezone: data.booking_timezone ?? "UTC",
    slotBufferMinutes: data.slot_buffer_minutes ?? 15,
    advanceBookingDays: data.advance_booking_days ?? 14,
    businessHoursEnabled: data.business_hours_enabled ?? false,
    businessHoursStart: data.business_hours_start ?? "09:00",
    businessHoursEnd: data.business_hours_end ?? "18:00",
    businessDays: data.business_days ?? [1, 2, 3, 4, 5],
  };
}

export async function saveBusinessBookingSettings(
  businessId: string,
  input: {
    bookingTimezone?: string;
    slotBufferMinutes?: number;
    advanceBookingDays?: number;
    businessHoursEnabled?: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessDays?: number[];
  },
): Promise<{ success: boolean; message?: string }> {
  const admin = createAdminClient();
  const existing = await getBusinessBookingSetup(businessId);

  const { error } = await admin.from("business_booking_setup").upsert(
    {
      business_id: businessId,
      business_type: existing?.businessType ?? "generic",
      business_type_label: existing?.businessTypeLabel ?? "Business",
      operating_hours_note: existing?.operatingHoursNote ?? "",
      generated_from_knowledge_at: existing?.generatedFromKnowledgeAt,
      booking_timezone: input.bookingTimezone ?? existing?.bookingTimezone ?? "UTC",
      slot_buffer_minutes:
        input.slotBufferMinutes ?? existing?.slotBufferMinutes ?? 15,
      advance_booking_days:
        input.advanceBookingDays ?? existing?.advanceBookingDays ?? 14,
      business_hours_enabled:
        input.businessHoursEnabled ?? existing?.businessHoursEnabled ?? false,
      business_hours_start:
        input.businessHoursStart ?? existing?.businessHoursStart ?? "09:00",
      business_hours_end:
        input.businessHoursEnd ?? existing?.businessHoursEnd ?? "18:00",
      business_days: input.businessDays ?? existing?.businessDays ?? [1, 2, 3, 4, 5],
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateCalendarPaths();
  return { success: true };
}

export function formatCalendarResourcesForAiPrompt(
  resources: BusinessCalendarResource[],
  setup: BusinessBookingSetup | null,
): string {
  if (resources.length === 0) {
    return "";
  }

  const lines = resources.map((resource) => {
    const parts = [
      `${resource.name} (${resource.resourceType})`,
      resource.durationMinutes ? `${resource.durationMinutes} min` : null,
      resource.capacity > 1 ? `capacity ${resource.capacity}` : null,
      resource.description ? resource.description : null,
    ].filter(Boolean);

    return `- ${parts.join(" · ")}`;
  });

  const header = setup?.businessTypeLabel
    ? `Bookable resources for ${setup.businessTypeLabel}:`
    : "Bookable resources:";

  const hours = setup?.operatingHoursNote?.trim()
    ? `\nHours note: ${setup.operatingHoursNote.trim()}`
    : "";

  return [header, ...lines, hours].join("\n");
}

async function extractCalendarResourcesFromKnowledge(input: {
  businessId: string;
  knowledgeContext: string;
  entries: KnowledgeEntryData[];
}): Promise<CalendarResourceExtraction> {
  const result = await generateTextWithFallback({
    businessId: input.businessId,
    callType: "crm_plan",
    preferredProvider: "gemini",
    systemInstruction:
      "You analyze business knowledge and design a booking calendar structure. Reply with valid JSON only.",
    prompt: [
      "Read the business knowledge base and propose bookable calendar resources.",
      "",
      "Rules:",
      "- Detect business type: hotel → rooms; restaurant → tables; barbershop/salon → staff/chairs; clinic → rooms/staff; auto_service → lifts/bays/services.",
      "- Extract every distinct bookable unit mentioned (room numbers, tables, masters, services with duration).",
      "- If exact names are missing, infer sensible defaults (Table 1..N, Room 101.., Master Anna).",
      "- durationMinutes: typical appointment length (hotel room = 1440, table = 120, haircut = 45).",
      "- capacity: guests per unit (table seats, room guests).",
      "- operatingHoursNote: short summary from Business Hours category if present.",
      "",
      "Return JSON:",
      '{"businessType":"hotel|restaurant|barbershop|salon|clinic|auto_service|generic","businessTypeLabel":"Hotel","operatingHoursNote":"","resources":[{"resourceType":"room|table|staff|chair|service|other","name":"Room 101","description":"","capacity":2,"durationMinutes":1440}]}',
      "",
      "Knowledge base:",
      input.knowledgeContext,
    ].join("\n"),
  });

  if (result.success) {
    const parsed = parseJsonObject(result.data.text);
    const validated = calendarResourceExtractionSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }
  }

  return buildHeuristicCalendarExtraction(input.entries);
}

export async function generateBusinessCalendarFromKnowledge(
  businessId: string,
): Promise<
  | {
      success: true;
      setup: BusinessBookingSetup;
      resources: BusinessCalendarResource[];
      replacedCount: number;
    }
  | { success: false; message: string }
> {
  const entries = await listKnowledgeEntriesForSetup(businessId);

  if (entries.length === 0) {
    return {
      success: false,
      message:
        "Add entries to Knowledge Base first — website sync or manual FAQs/services.",
    };
  }

  const extraction = await extractCalendarResourcesFromKnowledge({
    businessId,
    knowledgeContext: buildKnowledgeContext(entries),
    entries,
  });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin.from("business_calendar_resources").delete().eq("business_id", businessId);

  const resourceRows = extraction.resources.map((resource, index) => ({
    business_id: businessId,
    resource_type: resource.resourceType,
    name: resource.name,
    description: resource.description?.trim() ?? "",
    capacity: resource.capacity ?? 1,
    duration_minutes: resource.durationMinutes ?? 60,
    sort_order: index,
    active: true,
    source: "ai_knowledge",
  }));

  const { error: insertError } = await admin
    .from("business_calendar_resources")
    .insert(resourceRows);

  if (insertError) {
    return {
      success: false,
      message: "Failed to save calendar resources.",
    };
  }

  await admin.from("business_booking_setup").upsert(
    {
      business_id: businessId,
      business_type: extraction.businessType,
      business_type_label: extraction.businessTypeLabel,
      operating_hours_note: extraction.operatingHoursNote?.trim() ?? "",
      generated_from_knowledge_at: now,
    },
    { onConflict: "business_id" },
  );

  const [setup, resources] = await Promise.all([
    getBusinessBookingSetup(businessId),
    listBusinessCalendarResources(businessId),
  ]);

  if (!setup) {
    return {
      success: false,
      message: "Calendar setup saved but could not be loaded.",
    };
  }

  revalidateCalendarPaths();

  return {
    success: true,
    setup,
    resources,
    replacedCount: resources.length,
  };
}

export async function generateBusinessCalendarFromKnowledgeForUser(): Promise<
  | {
      success: true;
      setup: BusinessBookingSetup;
      resources: BusinessCalendarResource[];
      replacedCount: number;
    }
  | { success: false; message: string }
> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return generateBusinessCalendarFromKnowledge(business.id);
}
