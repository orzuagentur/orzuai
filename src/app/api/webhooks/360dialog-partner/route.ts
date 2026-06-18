import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  verifyDialog360PartnerWebhookSignature,
  type Dialog360PartnerWebhookPayload,
} from "@/lib/dialog360/partner";
import { processDialog360PartnerWebhook } from "@/services/whatsapp.service";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-360dialog-signature");
  const platformSecret =
    process.env[ENV_KEYS.DIALOG360_PLATFORM_SECRET]?.trim();

  if (platformSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    if (!verifyDialog360PartnerWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  let payload: Dialog360PartnerWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as Dialog360PartnerWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await processDialog360PartnerWebhook(payload);

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    event: payload.event ?? null,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
