import "server-only";

import {
  formatBookingAnswersForDescription,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";
import { formatSlotForDisplay } from "@/lib/calendar/slot-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContactSnapshot } from "@/services/agent-task-executor.service";
import { sendBookingConfirmationEmail } from "@/services/booking-confirmation-email.service";
import {
  getBookingPageByIdAdmin,
  listPublishedBookingPagesForBusinessAdmin,
} from "@/services/booking-pages.service";
import type { BookingPageRecord } from "@/types/booking-page.types";
import { createCalendarEventForBusiness } from "@/services/calendar-events.service";
import {
  resolveBookingSlot,
  type BookingSlotResolution,
} from "@/services/calendar-availability.service";
import { listPublicBookingPageResources } from "@/services/business-calendar-resources.service";
import {
  getBusinessBookingSetup,
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";

function splitContactName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "Guest", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "" };
  }

  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function inferCountFromMessage(message: string): string | null {
  const patterns = [
    /(\d+)\s*(guests?|people|persons?|pax|adults?)/i,
    /party\s*(?:of|size)?\s*(\d+)/i,
    /на\s*(\d+)\s*(человек|гост|чел)/i,
    /(\d+)\s*(человек|гост|чел)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function buildBookingFormAnswersForAi(input: {
  formFields: BookingFormField[];
  contact: ContactSnapshot | null;
  clientMessage?: string;
  overrides?: Record<string, string>;
}): Record<string, string> {
  const answers: Record<string, string> = { ...(input.overrides ?? {}) };
  const nameParts = splitContactName(input.contact?.name ?? "");
  const inferredCount = inferCountFromMessage(input.clientMessage ?? "");

  for (const field of input.formFields) {
    if (answers[field.key]?.trim()) {
      continue;
    }

    switch (field.key) {
      case "firstName":
        answers[field.key] = nameParts.firstName;
        break;
      case "lastName":
        answers[field.key] = nameParts.lastName;
        break;
      case "email":
        if (input.contact?.email?.trim()) {
          answers[field.key] = input.contact.email.trim();
        }
        break;
      case "phone":
        if (input.contact?.phoneNumber?.trim()) {
          answers[field.key] = input.contact.phoneNumber.trim();
        }
        break;
      case "guestCount":
      case "partySize":
        answers[field.key] = inferredCount ?? "1";
        break;
      case "notes":
      case "checkInNotes":
      case "specialRequests":
      case "serviceNotes":
        if (input.clientMessage?.trim()) {
          answers[field.key] = input.clientMessage.trim().slice(0, 500);
        }
        break;
      default:
        if (field.type === "number" && field.required) {
          answers[field.key] = inferredCount ?? "1";
        }
        break;
    }
  }

  for (const field of input.formFields) {
    if (!field.required || answers[field.key]?.trim()) {
      continue;
    }

    if (field.type === "first_name") {
      answers[field.key] = nameParts.firstName;
    } else if (field.type === "last_name") {
      answers[field.key] = nameParts.lastName;
    } else if (field.type === "email" && input.contact?.email) {
      answers[field.key] = input.contact.email.trim();
    } else if (field.type === "phone" && input.contact?.phoneNumber) {
      answers[field.key] = input.contact.phoneNumber.trim();
    } else if (field.type === "number") {
      answers[field.key] = inferredCount ?? "1";
    } else if (field.type === "text") {
      answers[field.key] = "—";
    }
  }

  return answers;
}

export function formatBookingPagesForAiPrompt(pages: BookingPageRecord[]): string {
  if (pages.length === 0) {
    return "";
  }

  const lines = pages.map((page) => {
    const fieldKeys = page.formFields.map((field) => field.key).join(", ");
    return `- ${page.title} (id: ${page.id}, type: ${page.businessTypeLabel}, timezone: ${page.bookingTimezone}, fields: ${fieldKeys})`;
  });

  return [
    "Published booking pages:",
    ...lines,
    "When booking, pick the matching page id for hotel/restaurant/salon etc. Fill all form fields from contact + conversation (guestCount, partySize, check-in/out dates as start/end).",
  ].join("\n");
}

export async function isCalendarBookingEnabled(businessId: string): Promise<boolean> {
  const [resources, pages] = await Promise.all([
    listBusinessCalendarResources(businessId),
    listPublishedBookingPagesForBusinessAdmin(businessId),
  ]);

  return resources.length > 0 || pages.length > 0;
}

export type AiCalendarBookingResult =
  | {
      success: true;
      summary: string;
      slotLabel: string;
      resourceName: string | null;
      customerEmail: string | null;
      rescheduled: boolean;
    }
  | {
      success: false;
      message: string;
      slotResolution?: BookingSlotResolution;
    };

export async function createAiCalendarBooking(input: {
  businessId: string;
  contact: ContactSnapshot | null;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  description?: string;
  resourceName?: string | null;
  resourceId?: string | null;
  bookingPageId?: string | null;
  formAnswers?: Record<string, string>;
  clientMessage?: string;
  preferNearestSlot?: boolean;
}): Promise<AiCalendarBookingResult> {
  const admin = createAdminClient();

  const [setup, resources, pages, businessRow] = await Promise.all([
    getBusinessBookingSetup(input.businessId),
    listBusinessCalendarResources(input.businessId),
    listPublishedBookingPagesForBusinessAdmin(input.businessId),
    admin
      .from("businesses")
      .select("business_name")
      .eq("id", input.businessId)
      .maybeSingle(),
  ]);

  const bookingPage =
    (input.bookingPageId
      ? pages.find((page) => page.id === input.bookingPageId) ??
        (await getBookingPageByIdAdmin(input.bookingPageId))
      : null) ?? pages[0] ?? null;

  const pageResources = bookingPage
    ? await listPublicBookingPageResources(bookingPage.id)
    : resources;

  const timeZone =
    input.timeZone?.trim() ||
    bookingPage?.bookingTimezone ||
    setup?.bookingTimezone ||
    "UTC";

  const slotResolution = await resolveBookingSlot({
    businessId: input.businessId,
    bookingPageId: bookingPage?.id,
    summary: input.summary,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    timeZone,
    resourceId: input.resourceId,
    resourceName: input.resourceName,
    preferNearestSlot: input.preferNearestSlot ?? true,
  });

  if (slotResolution.status === "unavailable") {
    const altText =
      slotResolution.alternatives.length > 0
        ? ` Try: ${slotResolution.alternatives.slice(0, 3).join(", ")}`
        : "";

    return {
      success: false,
      message: `${slotResolution.reason}${altText}`,
      slotResolution,
    };
  }

  const resolvedStart = slotResolution.startDateTime;
  const resolvedEnd = slotResolution.endDateTime;
  const resolvedResourceName = slotResolution.resourceName;

  const resource =
    (input.resourceId
      ? pageResources.find((item) => item.id === input.resourceId) ?? null
      : null) ??
    (resolvedResourceName
      ? pageResources.find(
          (item) =>
            item.name.toLowerCase() === resolvedResourceName.toLowerCase(),
        ) ?? null
      : null) ??
    pageResources[0] ??
    null;

  const formFields = bookingPage?.formFields ?? [];
  const formAnswers = buildBookingFormAnswersForAi({
    formFields: formFields.length > 0 ? formFields : [],
    contact: input.contact,
    clientMessage: input.clientMessage,
    overrides: input.formAnswers,
  });

  const firstName = formAnswers.firstName?.trim() ?? "";
  const lastName = formAnswers.lastName?.trim() ?? "";
  const customerLabel =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    input.contact?.name?.trim() ||
    "Guest";

  const customerEmail =
    formAnswers.email?.trim() ||
    input.contact?.email?.trim() ||
    Object.entries(formAnswers).find(([key]) => key.toLowerCase().includes("email"))?.[1]?.trim() ||
    null;

  const titleParts = [
    bookingPage?.title,
    resolvedResourceName ?? resource?.name,
    customerLabel,
    input.summary.trim(),
  ].filter(Boolean);

  const title = [...new Set(titleParts)].join(" · ").slice(0, 200);

  const descriptionLines = [
    input.description?.trim(),
    ...formatBookingAnswersForDescription(formFields, formAnswers),
    resource?.name ? `Resource: ${resource.name}` : null,
    resolvedResourceName && resource?.name !== resolvedResourceName
      ? `Resource: ${resolvedResourceName}`
      : null,
    bookingPage ? `Source: AI assistant (${bookingPage.slug})` : "Source: AI assistant",
  ].filter(Boolean);

  const result = await createCalendarEventForBusiness({
    businessId: input.businessId,
    title,
    description: descriptionLines.join("\n"),
    startDateTime: resolvedStart,
    endDateTime: resolvedEnd,
    timeZone,
    resourceId: resource?.id ?? null,
    bookingPageId: bookingPage?.id ?? null,
    customerName: customerLabel,
    customerEmail: customerEmail ?? "",
    isBooking: true,
  });

  if (!result.success) {
    return { success: false, message: result.message ?? "Could not create booking." };
  }

  const slotLabel = formatSlotForDisplay(
    { start: new Date(resolvedStart), end: new Date(resolvedEnd) },
    timeZone,
  );

  if (customerEmail?.includes("@")) {
    await sendBookingConfirmationEmail({
      businessId: input.businessId,
      businessName: businessRow.data?.business_name ?? "Business",
      pageTitle: bookingPage?.title ?? "Booking",
      customerEmail,
      customerName: customerLabel,
      slotLabel,
      resourceName: resource?.name ?? resolvedResourceName ?? undefined,
      timeZone,
    });
  }

  return {
    success: true,
    summary: title,
    slotLabel,
    resourceName: resource?.name ?? resolvedResourceName,
    customerEmail,
    rescheduled: slotResolution.status === "rescheduled",
  };
}
