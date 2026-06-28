import { NextResponse } from "next/server";
import { z } from "zod";

import { checkBookingSlotAvailability } from "@/services/calendar-availability.service";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const schema = z.object({
  resourceId: z.string().uuid(),
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1),
  timeZone: z.string().min(1),
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
      return NextResponse.json(
        { success: false, available: false, message: "Resource not found.", field: "resource" },
        { status: 400 },
      );
    }

    const start = new Date(body.startDateTime);
    const end = new Date(body.endDateTime);

    if (end.getTime() <= start.getTime()) {
      return NextResponse.json({
        success: true,
        available: false,
        message: "End time must be after start time.",
        field: "time",
      });
    }

    const check = await checkBookingSlotAvailability({
      businessId: business.id,
      bookingPageId: body.bookingPageId,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      timeZone: body.timeZone,
      resourceId: resource.id,
      resourceName: resource.name,
    });

    return NextResponse.json({ success: true, ...check });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid booking check."
      : "Could not check availability.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
