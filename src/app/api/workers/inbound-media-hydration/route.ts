import { NextResponse, type NextRequest } from "next/server";

import { verifyQStashInboundMediaRequest } from "@/lib/queue/qstash-inbound-media-worker";
import {
  drainInboundMediaHydrationQueue,
  runInboundMediaHydration,
} from "@/services/inbound-media-hydration.service";

type WorkerBody = {
  messageId?: string | null;
};

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("Upstash-Signature");

  if (!(await verifyQStashInboundMediaRequest(signature, bodyText))) {
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

  if (body.messageId) {
    const result = await runInboundMediaHydration(body.messageId);

    return NextResponse.json({
      success: true,
      worker: "qstash",
      mode: "single",
      ...result,
    });
  }

  const result = await drainInboundMediaHydrationQueue();

  return NextResponse.json({
    success: true,
    worker: "qstash",
    mode: "drain",
    ...result,
  });
}
