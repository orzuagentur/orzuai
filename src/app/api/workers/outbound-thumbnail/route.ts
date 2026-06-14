import { NextResponse, type NextRequest } from "next/server";

import { verifyQStashWebhookRequest } from "@/lib/queue/qstash-webhook-worker";
import { runOutboundAttachmentThumbnail } from "@/services/chat-attachment-thumbnail.service";

type WorkerBody = {
  messageId?: string;
  storagePath?: string;
  mimeType?: string;
  attempt?: number;
  maxAttempts?: number;
};

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("Upstash-Signature");

  if (!(await verifyQStashWebhookRequest(signature, bodyText))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WorkerBody = {};

  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as WorkerBody;
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  }

  if (!body.messageId || !body.storagePath || !body.mimeType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await runOutboundAttachmentThumbnail({
    messageId: body.messageId,
    storagePath: body.storagePath,
    mimeType: body.mimeType,
    attempt: body.attempt ?? 1,
    maxAttempts: body.maxAttempts ?? 3,
  });

  return NextResponse.json({
    success: result.completed,
    worker: "qstash",
    ...result,
  });
}
