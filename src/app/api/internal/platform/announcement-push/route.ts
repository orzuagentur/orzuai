import { NextResponse } from "next/server";
import { z } from "zod";

import { ENV_KEYS } from "@/constants/env-keys";
import { broadcastPlatformAnnouncementPush } from "@/services/platform-announcement-push.service";

const bodySchema = z.object({
  announcementId: z.string().uuid(),
});

export async function POST(request: Request) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await broadcastPlatformAnnouncementPush(parsed.data.announcementId);

  return NextResponse.json({ success: true, ...result });
}
