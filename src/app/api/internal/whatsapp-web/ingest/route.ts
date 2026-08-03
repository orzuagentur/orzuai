import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  ingestWhatsAppWebMessages,
  type WhatsAppWebInboundMessage,
} from "@/services/whatsapp-web.service";

export const runtime = "nodejs";

const payloadSchema = z.object({
  businessId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        from: z.string().min(1),
        chatJid: z.string().min(1).nullish(),
        externalMessageId: z.string().min(1),
        senderName: z.string().nullish(),
        text: z.string(),
        sentAt: z.string().nullish(),
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
      { error: "WhatsApp Web ingest is not configured." },
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

  const messages: WhatsAppWebInboundMessage[] = parsed.data.messages;
  const result = await ingestWhatsAppWebMessages(
    parsed.data.businessId,
    messages,
  );

  return NextResponse.json({ success: true, processed: result.processed });
}
