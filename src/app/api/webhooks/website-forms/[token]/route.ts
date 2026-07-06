import { NextResponse, type NextRequest } from "next/server";

import { extractWebsiteFormApiKey } from "@/lib/website-forms/auth";
import { processWebsiteFormWebhook } from "@/services/website-forms.service";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-OrzuAI-Api-Key, Authorization",
};

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const apiKey = extractWebsiteFormApiKey(request);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const result = await processWebsiteFormWebhook(token, apiKey, body, request);

  if (!result.success) {
    const status = result.message === "Unauthorized" ? 401 : 400;

    return NextResponse.json(result, { status, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    { success: true, message: "Lead received" },
    { headers: CORS_HEADERS },
  );
}
