import { NextResponse, type NextRequest } from "next/server";

import {
  isValidGmailPushToken,
  parseGmailPushEnvelope,
  type PubSubPushEnvelope,
} from "@/lib/gmail/push";
import { handleGmailPushNotification } from "@/services/gmail-integration.service";

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!isValidGmailPushToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PubSubPushEnvelope;

  try {
    body = (await request.json()) as PubSubPushEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const notification = parseGmailPushEnvelope(body);

  if (!notification) {
    return NextResponse.json({ success: true, ignored: true });
  }

  const result = await handleGmailPushNotification(notification);

  return NextResponse.json({
    success: true,
    imported: result.imported,
    synced: result.synced,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
