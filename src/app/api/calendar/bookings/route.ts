import { NextResponse } from "next/server";
import { z } from "zod";

import { createCalendarEventForBusiness } from "@/services/calendar-events.service";
import { resolveBookingSlot } from "@/services/calendar-availability.service";
import { sendBookingConfirmationEmail } from "@/services/booking-confirmation-email.service";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { formatSlotForDisplay } from "@/lib/calendar/slot-engine";

const schema = z.object({
  resourceId: z.string().uuid(),
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1).optional(),
  timeZone: z.string().min(1),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().email().optional().or(z.literal("")),
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
    const end = body.endDateTime
      ? new Date(body.endDateTime)
      : new Date(start.getTime() + resource.durationMinutes * 60 * 1000);

    const summary = [resource.name, body.customerName].filter(Boolean).join(" · ");

    const slotResolution = await resolveBookingSlot({
      businessId: business.id,
      bookingPageId: body.bookingPageId,
      summary,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      timeZone: body.timeZone,
      resourceName: resource.name,
      preferNearestSlot: false,
    });

    if (slotResolution.status === "unavailable") {
      return NextResponse.json(
        { success: false, message: slotResolution.reason },
        { status: 400 },
      );
    }

    const description = [
      body.notes?.trim() ? `Notes: ${body.notes.trim()}` : null,
      body.customerPhone?.trim() ? `Phone: ${body.customerPhone.trim()}` : null,
      body.customerEmail?.trim() ? `Email: ${body.customerEmail.trim()}` : null,
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
      customerName: body.customerName,
      customerEmail: body.customerEmail ?? "",
      isBooking: true,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (body.customerEmail?.includes("@")) {
      await sendBookingConfirmationEmail({
        businessId: business.id,
        businessName: business.business_name,
        pageTitle: resource.name,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        slotLabel: formatSlotForDisplay(
          {
            start: new Date(slotResolution.startDateTime),
            end: new Date(slotResolution.endDateTime),
          },
          body.timeZone,
        ),
        resourceName: resource.name,
        timeZone: body.timeZone,
      });
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid booking data."
      : "Could not create booking.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
