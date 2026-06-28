import { NextResponse } from "next/server";
import { z } from "zod";

import { createCalendarEventForBusiness } from "@/services/calendar-events.service";
import { resolveBookingSlot } from "@/services/calendar-availability.service";
import { sendBookingConfirmationEmail } from "@/services/booking-confirmation-email.service";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { formatSlotForDisplay } from "@/lib/calendar/slot-engine";

const guestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
});

const schema = z.object({
  resourceId: z.string().uuid(),
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1),
  timeZone: z.string().min(1),
  guests: z.array(guestSchema).min(1).max(20),
  customerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  bookingPageId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json({ success: false, message: "Business not found." }, { status: 400 });
    }

    const body = schema.parse(await request.json());
    const resources = await listAllBusinessCalendarResources(business.id);
    const resource = resources.find((item) => item.id === body.resourceId);

    if (!resource) {
      return NextResponse.json({ success: false, message: "Resource not found." }, { status: 400 });
    }

    const start = new Date(body.startDateTime);
    const end = new Date(body.endDateTime);

    if (end.getTime() <= start.getTime()) {
      return NextResponse.json(
        { success: false, message: "End time must be after start time." },
        { status: 400 },
      );
    }

    const primaryGuest = body.guests[0]!;
    const guestSummary = body.guests.map((guest) => guest.name).join(", ");
    const summary = [resource.name, guestSummary].filter(Boolean).join(" · ");

    const slotResolution = await resolveBookingSlot({
      businessId: business.id,
      bookingPageId: body.bookingPageId,
      summary,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      timeZone: body.timeZone,
      resourceId: resource.id,
      resourceName: resource.name,
      preferNearestSlot: false,
    });

    if (slotResolution.status === "unavailable") {
      return NextResponse.json(
        { success: false, message: slotResolution.reason },
        { status: 400 },
      );
    }

    const guestLines = body.guests.map(
      (guest, index) => `Guest ${index + 1}: ${guest.name} <${guest.email}>`,
    );

    const description = [
      body.notes?.trim() ? `Notes: ${body.notes.trim()}` : null,
      body.customerPhone?.trim() ? `Phone: ${body.customerPhone.trim()}` : null,
      ...guestLines,
      `Resource: ${resource.name}`,
      "Source: Dashboard booking",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await createCalendarEventForBusiness({
      businessId: business.id,
      title: summary,
      description,
      startDateTime: slotResolution.startDateTime,
      endDateTime: slotResolution.endDateTime,
      timeZone: body.timeZone,
      resourceId: resource.id,
      bookingPageId: body.bookingPageId ?? null,
      customerName: guestSummary,
      customerEmail: primaryGuest.email,
      isBooking: true,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const slotLabel = formatSlotForDisplay(
      {
        start: new Date(slotResolution.startDateTime),
        end: new Date(slotResolution.endDateTime),
      },
      body.timeZone,
    );

    for (const guest of body.guests) {
      const emailResult = await sendBookingConfirmationEmail({
        businessId: business.id,
        businessName: business.business_name,
        pageTitle: resource.name,
        customerEmail: guest.email,
        customerName: guest.name,
        slotLabel,
        resourceName: resource.name,
        timeZone: body.timeZone,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: emailResult.error ?? "Booking saved but confirmation email could not be sent.",
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid booking data."
      : "Could not create booking.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
