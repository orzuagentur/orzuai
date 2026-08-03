import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ENV_KEYS } from "@/constants/env-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyWhatsAppDeliveryStatusUpdates } from "@/services/message-delivery-status.service";

export const runtime = "nodejs";

const payloadSchema = z.object({
  businessId: z.string().uuid(),
  statuses: z
    .array(
      z.object({
        providerMessageId: z.string().min(1),
        status: z.enum(["sent", "delivered", "read", "failed"]),
      }),
    )
    .max(200),
});

function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env[ENV_KEYS.WHATSAPP_WEB_SECRET]?.trim();

  if (!expected) {
    return NextResponse.json(
      { error: "WhatsApp Web status ingest is not configured." },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-userbot-secret")?.trim();

  if (!provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const processed = await applyWhatsAppDeliveryStatusUpdates(
    createAdminClient(),
    parsed.data.statuses,
    parsed.data.businessId,
  );

  return NextResponse.json({ success: true, processed });
}
