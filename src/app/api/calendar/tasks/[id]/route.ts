import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteCalendarTaskForBusiness,
  updateCalendarTaskStatusForBusiness,
} from "@/services/calendar-events.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  status: z.enum(["open", "done"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business profile required." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const result = await updateCalendarTaskStatusForBusiness({
      businessId: business.id,
      taskId: id,
      status: body.status,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid task update."
      : "Could not update task.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business profile required." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const result = await deleteCalendarTaskForBusiness({
      businessId: business.id,
      taskId: id,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not delete task." },
      { status: 500 },
    );
  }
}
