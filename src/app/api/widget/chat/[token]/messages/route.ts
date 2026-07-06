import { NextResponse, type NextRequest } from "next/server";

import { extractWebsiteFormApiKey } from "@/lib/website-forms/auth";
import { listWebsiteChatMessages } from "@/services/website-chat.service";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-OrzuAI-Api-Key, Authorization",
};

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const apiKey = extractWebsiteFormApiKey(request);
  const visitorId = request.nextUrl.searchParams.get("visitorId")?.trim();
  const after = request.nextUrl.searchParams.get("after")?.trim() || undefined;

  if (!visitorId) {
    return NextResponse.json(
      { success: false, message: "visitorId is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const messages = await listWebsiteChatMessages(token, apiKey, visitorId, after);

  if (messages === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json({ success: true, messages }, { headers: CORS_HEADERS });
}
