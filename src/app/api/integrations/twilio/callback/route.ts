import { NextResponse, type NextRequest } from "next/server";

import { TWILIO_INTEGRATION_HREF } from "@/features/twilio/constants";
import { verifyTwilioConnectState } from "@/lib/twilio/connect";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { completeTwilioConnectAuthorization } from "@/services/twilio-integration.service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountSid = searchParams.get("AccountSid");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error === "unauthorized_client") {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=denied`, request.url),
    );
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=${error}`, request.url),
    );
  }

  if (!accountSid || !state) {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=missing_account`, request.url),
    );
  }

  const parsedState = await verifyTwilioConnectState(state);

  if (!parsedState) {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=invalid_state`, request.url),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business || business.id !== parsedState.businessId) {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=unauthorized`, request.url),
    );
  }

  const result = await completeTwilioConnectAuthorization({
    businessId: business.id,
    connectedAccountSid: accountSid,
  });

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`${TWILIO_INTEGRATION_HREF}?error=connect_failed`, request.url),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${TWILIO_INTEGRATION_HREF}?${result.autoConnected ? "connected=1" : "authorized=1"}`,
      request.url,
    ),
  );
}
