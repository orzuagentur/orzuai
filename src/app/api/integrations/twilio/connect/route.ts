import { NextResponse, type NextRequest } from "next/server";

import { TWILIO_INTEGRATION_HREF } from "@/features/twilio/constants";

/** Twilio Connect OAuth removed — OrzuX issues platform numbers (HeyKiki model). */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL(`${TWILIO_INTEGRATION_HREF}?info=platform_numbers`, request.url),
  );
}
