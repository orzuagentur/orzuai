import { NextResponse } from "next/server";

import {
  saveBookingPageForUser,
  type SaveBookingPageInput,
} from "@/features/google-calendar/save-booking-page.server";
import { deleteBookingPage } from "@/services/booking-pages.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveBookingPageInput;
    const result = await saveBookingPageForUser(body);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not save booking page." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found." },
        { status: 400 },
      );
    }

    const pageId = new URL(request.url).searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { success: false, message: "Missing page id." },
        { status: 400 },
      );
    }

    const result = await deleteBookingPage(business.id, pageId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not delete booking page." },
      { status: 500 },
    );
  }
}
