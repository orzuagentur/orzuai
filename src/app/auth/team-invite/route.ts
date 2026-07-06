import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";
import { resolveTeamInviteAuthUrl } from "@/services/team-invite.service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.teamInviteAccept}/expired`, request.url),
    );
  }

  const authUrl = await resolveTeamInviteAuthUrl(token);

  if (!authUrl) {
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.teamInviteAccept}/expired`, request.url),
    );
  }

  return NextResponse.redirect(authUrl);
}
