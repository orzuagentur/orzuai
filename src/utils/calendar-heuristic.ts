import type {
  BusinessBookingType,
  CalendarResourceExtraction,
  CalendarResourceType,
} from "@/types/business-calendar-resource.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import { getBusinessTypePreset } from "@/lib/calendar/business-type-presets";

function detectBusinessType(text: string): {
  type: BusinessBookingType;
  label: string;
} {
  if (/гостиниц|hotel|номер|room|suite|хостел/i.test(text)) {
    return { type: "hotel", label: "Гостиница" };
  }

  if (/ресторан|restaurant|столик|table|кафе|cafe|бар\b|bar\b/i.test(text)) {
    return { type: "restaurant", label: "Ресторан" };
  }

  if (/барбер|barber|парикмахер|barbershop/i.test(text)) {
    return { type: "barbershop", label: "Барбершоп" };
  }

  if (/салон|salon|beauty|маникюр|nail/i.test(text)) {
    return { type: "salon", label: "Салон красоты" };
  }

  if (/клиник|clinic|врач|doctor|медицин/i.test(text)) {
    return { type: "clinic", label: "Клиника" };
  }

  if (
    /автосервис|сто\b|auto\s*service|car\s*service|ремонт\s*авто|шиномонтаж|техобслуживан|car\s*repair/i.test(
      text,
    )
  ) {
    return { type: "auto_service", label: "Автосервис" };
  }

  return { type: "generic", label: "Бизнес" };
}

function extractRoomNumbers(text: string): string[] {
  const matches = text.match(/\b(?:номер|room|suite)\s*[#№]?\s*(\d{2,4})\b/gi) ?? [];
  const numbers = new Set<string>();

  for (const match of matches) {
    const num = match.match(/(\d{2,4})/)?.[1];
    if (num) {
      numbers.add(`Номер ${num}`);
    }
  }

  return [...numbers];
}

function extractStaffNames(text: string): string[] {
  const matches =
    text.match(
      /\b(?:мастер|master|barber|stylist|врач|doctor)\s+([A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁ][a-zа-яё]+)?)/g,
    ) ?? [];

  return matches
    .map((match) => match.replace(/^(мастер|master|barber|stylist|врач|doctor)\s+/i, "").trim())
    .filter(Boolean)
    .map((name) => `Мастер ${name}`);
}

function buildDefaultResources(
  businessType: BusinessBookingType,
): CalendarResourceExtraction["resources"] {
  return getBusinessTypePreset(businessType).resources.map((resource) => ({
    resourceType: resource.resourceType,
    name: resource.name,
    description: resource.description,
    capacity: resource.capacity,
    durationMinutes: resource.durationMinutes,
  }));
}

export function buildHeuristicCalendarExtraction(
  entries: KnowledgeEntryData[],
): CalendarResourceExtraction {
  const combined = entries
    .map((entry) => `${entry.title}\n${entry.content}`)
    .join("\n");
  const text = combined.toLowerCase();
  const { type, label } = detectBusinessType(text);

  const hoursEntry = entries.find((entry) => entry.category === "Business Hours");
  const operatingHoursNote = hoursEntry
    ? `${hoursEntry.title}: ${hoursEntry.content.trim().slice(0, 200)}`
    : "";

  let resources = buildDefaultResources(type);

  const rooms = extractRoomNumbers(combined);
  if (rooms.length > 0) {
    resources = rooms.map((name) => ({
      resourceType: "room" as CalendarResourceType,
      name,
      capacity: 2,
      durationMinutes: 1440,
    }));
  }

  const staff = extractStaffNames(combined);
  if (staff.length > 0 && (type === "barbershop" || type === "salon" || type === "clinic")) {
    resources = staff.map((name) => ({
      resourceType: "staff" as CalendarResourceType,
      name,
      capacity: 1,
      durationMinutes: 45,
    }));
  }

  const tableMatch = combined.match(/(\d+)\s*(?:столик|table)/i);
  if (tableMatch && type === "restaurant") {
    const count = Math.min(Number.parseInt(tableMatch[1] ?? "6", 10) || 6, 20);
    resources = Array.from({ length: count }, (_, index) => ({
      resourceType: "table" as CalendarResourceType,
      name: `Столик ${index + 1}`,
      capacity: 4,
      durationMinutes: 120,
    }));
  }

  return {
    businessType: type,
    businessTypeLabel: label,
    operatingHoursNote,
    resources,
  };
}
