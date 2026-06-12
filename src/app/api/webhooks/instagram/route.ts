import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getInstagramVerifyToken,
  verifyInstagramWebhookSignature,
} from "@/lib/instagram/client";
import {
  buildWebhookIdempotencyKey,
  enqueueInboundWebhook,
} from "@/services/webhook-queue.service";
import type { InstagramWebhookPayload } from "@/types/instagram.types";

export async function GET(request: NextRequest) {
  const verifyToken = getInstagramVerifyToken();
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

  if (!verifyInstagramWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: InstagramWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const idempotencyKey = buildWebhookIdempotencyKey("instagram", rawBody);
  const result = await enqueueInboundWebhook(admin, {
    channel: "instagram",
    idempotencyKey,
    payload,
  });

  return NextResponse.json({
    success: true,
    queued: result.queued,
    duplicate: result.duplicate,
  });
}
