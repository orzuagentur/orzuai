import { NextResponse, type NextRequest } from "next/server";

import { verifyQStashWebhookRequest } from "@/lib/queue/qstash-webhook-worker";
import { drainAiReplyQueue } from "@/services/ai-reply-queue.service";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("Upstash-Signature");

  if (!(await verifyQStashWebhookRequest(signature, body))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainAiReplyQueue();

  return NextResponse.json({
    success: true,
    worker: "qstash",
    ...result,
  });
}
