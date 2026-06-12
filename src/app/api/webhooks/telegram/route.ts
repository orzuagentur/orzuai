import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildWebhookIdempotencyKey,
  enqueueInboundWebhook,
} from "@/services/webhook-queue.service";
import type { TelegramWebhookPayload } from "@/types/telegram.types";

export async function POST(request: NextRequest) {
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secretToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();

  let payload: TelegramWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as TelegramWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const idempotencyKey = buildWebhookIdempotencyKey("telegram", rawBody);
  const result = await enqueueInboundWebhook(admin, {
    channel: "telegram",
    idempotencyKey,
    payload,
    metadata: { secretToken },
  });

  return NextResponse.json({
    success: true,
    queued: result.queued,
    duplicate: result.duplicate,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
