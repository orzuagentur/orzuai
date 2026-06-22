import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  buildGoogleCalendarOAuthUrlForBusiness,
} from "@/services/google-calendar.service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url));
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return NextResponse.redirect(
      new URL(GOOGLE_CALENDAR_INTEGRATION_HREF, request.url),
    );
  }

  try {
    const authUrl = await buildGoogleCalendarOAuthUrlForBusiness(business.id);
    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(
      new URL(`${GOOGLE_CALENDAR_INTEGRATION_HREF}?error=oauth_not_configured`, request.url),
    );
  }
}
