import { NextResponse, type NextRequest } from "next/server";

import { extractWebsiteFormApiKey } from "@/lib/website-forms/auth";
import {
  getWebsiteChatConfigByToken,
  processWebsiteChatMessage,
} from "@/services/website-chat.service";
import { websiteChatMessageSchema } from "@/types/website-chat.types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  const config = await getWebsiteChatConfigByToken(token, apiKey);

  if (!config) {
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json({ success: true, config }, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const apiKey = extractWebsiteFormApiKey(request);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = websiteChatMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const result = await processWebsiteChatMessage(
    token,
    apiKey,
    request,
    parsed.data,
  );

  if (!result.success) {
    return NextResponse.json(
      result,
      {
        status: result.message === "Unauthorized" ? 401 : 400,
        headers: CORS_HEADERS,
      },
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}
