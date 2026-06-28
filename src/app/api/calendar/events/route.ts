import { NextResponse } from "next/server";
import { z } from "zod";

import { createCalendarEventForBusiness } from "@/services/calendar-events.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional(),
  location: z.string().max(500).optional(),
  startDateTime: z.string().min(1),
  endDateTime: z.string().min(1),
  timeZone: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business profile required." },
        { status: 400 },
      );
    }

    const body = schema.parse(await request.json());
    const result = await createCalendarEventForBusiness({
      businessId: business.id,
      title: body.title,
      description: body.description,
      location: body.location,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      timeZone: body.timeZone,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid event data."
      : "Could not create event.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
