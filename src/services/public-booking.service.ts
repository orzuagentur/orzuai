import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createCalendarEventForBusiness } from "@/services/calendar-events.service";
import {
  getPublicBookingPageSlots,
  resolveBookingSlot,
} from "@/services/calendar-availability.service";
import { sendBookingConfirmationEmail } from "@/services/booking-confirmation-email.service";
import { getPublishedBookingPageBySlug } from "@/services/booking-pages.service";
import { listPublicBookingPageResources } from "@/services/business-calendar-resources.service";
import {
  formatBookingAnswersForDescription,
  validateBookingFormAnswers,
} from "@/lib/calendar/booking-form-fields";
import { formatSlotForDisplay } from "@/lib/calendar/slot-engine";

const publicBookingSchema = z.object({
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1).optional(),
  resourceId: z.string().uuid().optional(),
  resourceName: z.string().trim().max(120).optional(),
  formAnswers: z.record(z.string(), z.string()),
});

export async function submitPublicBooking(
  slug: string,
  input: z.infer<typeof publicBookingSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = publicBookingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid booking request.",
    };
  }

  const page = await getPublishedBookingPageBySlug(slug);

  if (!page) {
    return { success: false, message: "Booking page not found." };
  }

  const validation = validateBookingFormAnswers(page.formFields, parsed.data.formAnswers);

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const resources = await listPublicBookingPageResources(page.id);
  const resource = parsed.data.resourceId
    ? resources.find((item) => item.id === parsed.data.resourceId) ?? resources[0]
    : parsed.data.resourceName
      ? resources.find(
          (item) =>
            item.name.toLowerCase() === parsed.data.resourceName!.toLowerCase(),
        ) ?? resources[0]
      : resources[0];

  const durationMinutes = resource?.durationMinutes ?? page.slotDurationMinutes;
  const start = new Date(parsed.data.startDateTime);
  const end = parsed.data.endDateTime
    ? new Date(parsed.data.endDateTime)
    : new Date(start.getTime() + durationMinutes * 60 * 1000);

  const firstName = parsed.data.formAnswers.firstName?.trim() ?? "";
  const lastName = parsed.data.formAnswers.lastName?.trim() ?? "";
  const customerLabel = [firstName, lastName].filter(Boolean).join(" ").trim() || "Customer";

  const summary = [page.title, resource?.name, customerLabel].filter(Boolean).join(" · ");

  const slotResolution = await resolveBookingSlot({
    businessId: page.businessId,
    bookingPageId: page.id,
    summary,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    timeZone: page.bookingTimezone,
    resourceName: resource?.name ?? null,
    preferNearestSlot: false,
  });

  if (slotResolution.status === "unavailable") {
    return {
      success: false,
      message:
        slotResolution.alternatives.length > 0
          ? `This time is no longer available. Try: ${slotResolution.alternatives.slice(0, 3).join(", ")}`
          : slotResolution.reason,
    };
  }

  const resolvedStart = slotResolution.startDateTime;
  const resolvedEnd = slotResolution.endDateTime;

  const descriptionLines = [
    ...formatBookingAnswersForDescription(page.formFields, parsed.data.formAnswers),
    resource?.name ? `Resource: ${resource.name}` : null,
    `Source: Public booking page (${page.slug})`,
  ].filter(Boolean);

  const customerEmail =
    parsed.data.formAnswers.email?.trim() ||
    Object.entries(parsed.data.formAnswers).find(([key]) =>
      key.toLowerCase().includes("email"),
    )?.[1]?.trim();

  const result = await createCalendarEventForBusiness({
    businessId: page.businessId,
    title: summary,
    description: descriptionLines.join("\n"),
    startDateTime: resolvedStart,
    endDateTime: resolvedEnd,
    timeZone: page.bookingTimezone,
    resourceId: resource?.id ?? null,
    bookingPageId: page.id,
    customerName: customerLabel,
    customerEmail: customerEmail ?? "",
    isBooking: true,
  });

  if (!result.success) {
    return result;
  }

  if (customerEmail?.includes("@")) {
    const slotLabel = formatSlotForDisplay(
      { start: new Date(resolvedStart), end: new Date(resolvedEnd) },
      page.bookingTimezone,
    );

    await sendBookingConfirmationEmail({
      businessId: page.businessId,
      businessName: page.businessName,
      pageTitle: page.title,
      customerEmail,
      customerName: customerLabel,
      slotLabel,
      resourceName: resource?.name,
      timeZone: page.bookingTimezone,
    });
  }

  revalidatePath(`/book/${slug}`);
  return { success: true };
}

export { getPublicBookingPageSlots };

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
