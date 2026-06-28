import { NextResponse } from "next/server";

import {
  getPublicBookingPageSlots,
  submitPublicBooking,
} from "@/services/public-booking.service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const data = await getPublicBookingPageSlots(slug, { date });

  if (!data) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    selectedDate: data.selectedDate,
    page: {
      title: data.page.title,
      businessName: data.page.businessName,
      businessTypeLabel: data.page.businessTypeLabel,
      timezone: data.page.bookingTimezone,
      durationMinutes: data.page.slotDurationMinutes,
      advanceBookingDays: data.page.advanceBookingDays,
      weeklySchedule: data.page.weeklySchedule,
      publicUrl: data.page.publicUrl,
      slug: data.page.slug,
    },
    formFields: data.page.formFields,
    resources: data.resources.map((resource) => ({
      name: resource.name,
      resourceType: resource.resourceType,
      durationMinutes: resource.durationMinutes,
    })),
    resourceSlots: data.resourceSlots,
    slots: data.slots,
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const result = await submitPublicBooking(slug, body);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not complete booking." },
      { status: 500 },
    );
  }
}
