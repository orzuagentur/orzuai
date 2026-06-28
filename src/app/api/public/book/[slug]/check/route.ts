import { NextResponse } from "next/server";
import { z } from "zod";

import { checkBookingSlotAvailability } from "@/services/calendar-availability.service";
import { getPublishedBookingPageBySlug } from "@/services/booking-pages.service";
import { listPublicBookingPageResources } from "@/services/business-calendar-resources.service";

const schema = z.object({
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1),
  resourceId: z.string().uuid().optional(),
});

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const page = await getPublishedBookingPageBySlug(slug);

    if (!page) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }

    const body = schema.parse(await request.json());
    const resources = await listPublicBookingPageResources(page.id);
    const resource = body.resourceId
      ? resources.find((item) => item.id === body.resourceId) ?? resources[0]
      : resources[0];

    if (!resource) {
      return NextResponse.json({
        success: true,
        available: false,
        message: "No resources configured for this page.",
        field: "resource",
      });
    }

    const check = await checkBookingSlotAvailability({
      businessId: page.businessId,
      bookingPageId: page.id,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      timeZone: page.bookingTimezone,
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
