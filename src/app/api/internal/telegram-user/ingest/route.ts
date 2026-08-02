import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  ingestTelegramUserMessages,
  type TelegramUserInboundMessage,
} from "@/services/telegram-user.service";

export const runtime = "nodejs";

const payloadSchema = z.object({
  businessId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        chatId: z.string().min(1),
        externalMessageId: z.string().min(1),
        senderName: z.string().nullish(),
        text: z.string(),
        sentAt: z.string().nullish(),
      }),
    )
    .max(200),
});

/** Constant-time comparison of two secrets (hashed to equal length first). */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env[ENV_KEYS.TELEGRAM_USERBOT_SECRET]?.trim();

  if (!expected) {
    return NextResponse.json(
      { error: "Userbot ingest is not configured." },
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

  const messages: TelegramUserInboundMessage[] = parsed.data.messages;
  const result = await ingestTelegramUserMessages(
    parsed.data.businessId,
    messages,
  );

  return NextResponse.json({ success: true, processed: result.processed });
}
