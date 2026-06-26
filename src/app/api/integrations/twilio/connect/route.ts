import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";
import { TWILIO_INTEGRATION_HREF } from "@/features/twilio/constants";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { buildTwilioConnectUrlForBusiness } from "@/services/twilio-integration.service";

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
    return NextResponse.redirect(new URL(TWILIO_INTEGRATION_HREF, request.url));
  }

  try {
    const authUrl = await buildTwilioConnectUrlForBusiness(business.id);
    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=oauth_not_configured`, request.url),
    );
  }
}
