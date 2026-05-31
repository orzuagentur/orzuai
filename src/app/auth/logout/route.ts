import { NextResponse, type NextRequest } from "next/server";

import { APP_ROUTES } from "@/constants/routes";
import { signOut } from "@/services/auth.service";

export async function GET(request: NextRequest) {
  const result = await signOut();

  if (!result.success) {
    const errorUrl = new URL(APP_ROUTES.home, request.url);
    errorUrl.searchParams.set("error", result.error);

    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(APP_ROUTES.home, request.url));
}
