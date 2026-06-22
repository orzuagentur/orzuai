import { NextResponse, type NextRequest } from "next/server";

import { EMAIL_INTEGRATION_HREF } from "@/features/email/constants";
import { verifyGmailOAuthState } from "@/lib/gmail/oauth";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { completeGmailOAuth } from "@/services/gmail-integration.service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`${EMAIL_INTEGRATION_HREF}?error=${error}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${EMAIL_INTEGRATION_HREF}?error=missing_code`, request.url),
    );
  }

  const parsedState = verifyGmailOAuthState(state);

  if (!parsedState) {
    return NextResponse.redirect(
      new URL(`${EMAIL_INTEGRATION_HREF}?error=invalid_state`, request.url),
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
      new URL(`${EMAIL_INTEGRATION_HREF}?error=unauthorized`, request.url),
    );
  }

  const result = await completeGmailOAuth(business.id, code);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`${EMAIL_INTEGRATION_HREF}?error=connect_failed`, request.url),
    );
  }

  return NextResponse.redirect(
    new URL(`${EMAIL_INTEGRATION_HREF}?connected=1`, request.url),
  );
}
