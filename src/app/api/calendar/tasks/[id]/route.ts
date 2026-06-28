import { NextResponse } from "next/server";

import { completeCalendarTaskForBusiness } from "@/services/calendar-events.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
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
    const result = await completeCalendarTaskForBusiness({
      businessId: business.id,
      taskId: id,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not complete task." },
      { status: 500 },
    );
  }
}
