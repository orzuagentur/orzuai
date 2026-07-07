import { NextResponse } from "next/server";

import { recordMarketingClick } from "@/services/marketing-tracking.service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  if (!token?.trim()) {
    return NextResponse.redirect("https://www.orzux.com/dashboard");
  }

  try {
    const destination = await recordMarketingClick(token.trim());

    if (destination) {
      return NextResponse.redirect(destination);
    }
  } catch (error) {
    console.error("[marketing-click]", error);
  }

  return NextResponse.redirect("https://www.orzux.com/dashboard");
}
