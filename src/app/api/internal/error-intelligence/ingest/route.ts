import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { reportPlatformError } from "@/services/error-intelligence.service";

type IngestBody = {
  severity?: "critical" | "high" | "warning" | "info";
  module?: string;
  category?: string;
  source?: string;
  title?: string;
  message?: string;
  description?: string;
  businessId?: string;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  correlationId?: string;
  traceId?: string;
  httpStatus?: number;
  method?: string;
  path?: string;
  durationMs?: number;
  retryCount?: number;
  stackTrace?: string;
  rawLog?: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: unknown;
  responseBody?: unknown;
  terminal?: Record<string, unknown>;
  context?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  environment?: "production" | "preview" | "development" | "test";
  rootCause?: string;
  suggestedFix?: string;
  impact?: string;
  recurrenceRisk?: string;
  secret?: string;
};

function authorizeIngest(request: Request, body: IngestBody): boolean {
  const headerSecret =
    request.headers.get("x-error-ingest-secret")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const configured =
    process.env.ERROR_INGEST_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";

  // Allow same-origin server reports without secret in development.
  if (!configured && process.env.NODE_ENV === "development") {
    return true;
  }

  if (!configured) {
    return false;
  }

  return headerSecret === configured || body.secret === configured;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing." },
      { status: 503 },
    );
  }

  let body: IngestBody;

  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!authorizeIngest(request, body)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { success: false, message: "title is required." },
      { status: 400 },
    );
  }

  const result = await reportPlatformError({
    severity: body.severity,
    module: body.module,
    category: body.category,
    source: body.source ?? "ingest-api",
    title: body.title,
    message: body.message,
    description: body.description,
    businessId: body.businessId,
    userId: body.userId,
    conversationId: body.conversationId,
    sessionId: body.sessionId,
    correlationId: body.correlationId,
    traceId: body.traceId,
    httpStatus: body.httpStatus,
    method: body.method,
    path: body.path,
    durationMs: body.durationMs,
    retryCount: body.retryCount,
    stackTrace: body.stackTrace,
    rawLog: body.rawLog,
    requestHeaders: body.requestHeaders,
    requestBody: body.requestBody,
    responseBody: body.responseBody,
    terminal: body.terminal,
    context: body.context,
    ai: body.ai,
    environment: body.environment,
    rootCause: body.rootCause,
    suggestedFix: body.suggestedFix,
    impact: body.impact,
    recurrenceRisk: body.recurrenceRisk,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({ success: true, id: result.id });
}
