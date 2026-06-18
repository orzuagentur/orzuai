import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppVerifyToken, verifyWhatsAppWebhookSignature } from "@/lib/whatsapp/client";
import {
  buildWebhookIdempotencyKey,
  receiveInboundWebhook,
} from "@/services/webhook-queue.service";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp.types";

export async function GET(request: NextRequest) {
  const verifyToken = getWhatsAppVerifyToken();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const idempotencyKey = buildWebhookIdempotencyKey("whatsapp", rawBody);
  const result = await receiveInboundWebhook(admin, {
    channel: "whatsapp",
    idempotencyKey,
    payload,
  });

  return NextResponse.json({
    success: true,
    queued: result.queued,
    duplicate: result.duplicate,
    processedInline: result.processedInline,
  });
}
