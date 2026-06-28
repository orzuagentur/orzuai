import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCalendarEventForBusiness,
  getCalendarEventForBusiness,
  updateCalendarEventForBusiness,
} from "@/services/calendar-events.service";
import { sendBookingActionEmail } from "@/services/booking-confirmation-email.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { formatSlotForDisplay } from "@/lib/calendar/slot-engine";
import {
  extractBookingGuests,
  notifyBookingGuests,
} from "@/lib/calendar/booking-guests";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  location: z.string().max(500).optional(),
  startDateTime: z.string().min(1).optional(),
  endDateTime: z.string().min(1).optional(),
  timeZone: z.string().min(1).optional(),
  resourceId: z.string().uuid().nullable().optional(),
});

const deleteSchema = z.object({
  notifyGuests: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json({ success: false, message: "Business not found." }, { status: 400 });
    }

    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const existing = await getCalendarEventForBusiness(business.id, id);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const result = await updateCalendarEventForBusiness({
      businessId: business.id,
      eventId: id,
      ...body,
    });

    if (!result.success || !result.event) {
      return NextResponse.json(result, { status: 400 });
    }

    if (result.event.isBooking) {
      const resources = await listAllBusinessCalendarResources(business.id);
      const resource = resources.find((item) => item.id === result.event!.resourceId);
      const slotLabel = formatSlotForDisplay(
        { start: new Date(result.event.startAt), end: new Date(result.event.endAt) },
        result.event.timezone,
      );
      const guests = extractBookingGuests(result.event);

      if (guests.length > 0) {
        const emailResult = await notifyBookingGuests({
          guests,
          send: (guest) =>
            sendBookingActionEmail({
              businessId: business.id,
              businessName: business.business_name,
              customerEmail: guest.email,
              customerName: guest.name,
              action: "updated",
              slotLabel,
              resourceName: resource?.name,
              pageTitle: result.event!.title,
            }),
        });

        if (!emailResult.success) {
          return NextResponse.json(
            { success: false, message: emailResult.error ?? "Could not notify guests." },
            { status: 502 },
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid event data."
      : "Could not update event.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json({ success: false, message: "Business not found." }, { status: 400 });
    }

    const { id } = await context.params;
    let notifyGuests = true;

    try {
      const rawBody = await request.text();
      if (rawBody.trim()) {
        const body = deleteSchema.parse(JSON.parse(rawBody));
        if (body.notifyGuests !== undefined) {
          notifyGuests = body.notifyGuests;
        }
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid delete request." }, { status: 400 });
    }

    const existing = await getCalendarEventForBusiness(business.id, id);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const result = await deleteCalendarEventForBusiness({
      businessId: business.id,
      eventId: id,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (existing.isBooking && notifyGuests) {
      const resources = await listAllBusinessCalendarResources(business.id);
      const resource = resources.find((item) => item.id === existing.resourceId);
      const slotLabel = formatSlotForDisplay(
        { start: new Date(existing.startAt), end: new Date(existing.endAt) },
        existing.timezone,
      );
      const guests = extractBookingGuests(existing);

      if (guests.length > 0) {
        const emailResult = await notifyBookingGuests({
          guests,
          send: (guest) =>
            sendBookingActionEmail({
              businessId: business.id,
              businessName: business.business_name,
              customerEmail: guest.email,
              customerName: guest.name,
              action: "cancelled",
              slotLabel,
              resourceName: resource?.name,
              pageTitle: existing.title,
            }),
        });

        if (!emailResult.success) {
          return NextResponse.json(
            { success: false, message: emailResult.error ?? "Could not notify guests." },
            { status: 502 },
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Could not delete event." }, { status: 500 });
  }
}
