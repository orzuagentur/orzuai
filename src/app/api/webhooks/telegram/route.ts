import { NextResponse, type NextRequest } from "next/server";

import { processTelegramWebhook } from "@/services/telegram.service";
import type { TelegramWebhookPayload } from "@/types/telegram.types";

export async function POST(request: NextRequest) {
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secretToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: TelegramWebhookPayload;

  try {
    payload = (await request.json()) as TelegramWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await processTelegramWebhook(secretToken, payload);

  return NextResponse.json({
    success: true,
    processed: result.processed,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
