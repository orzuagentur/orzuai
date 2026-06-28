import { NextResponse } from "next/server";
import { z } from "zod";

import { createCalendarTaskForBusiness } from "@/services/calendar-events.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().min(1),
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
    const result = await createCalendarTaskForBusiness({
      businessId: business.id,
      title: body.title,
      dueAt: body.dueAt,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid task data."
      : "Could not create task.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
