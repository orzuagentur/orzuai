import "server-only";

import { createHash } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import type { Json } from "@/types/database.types";

function asJson(value: unknown): Json {
  return value as Json;
}

export type ReportPlatformErrorInput = {
  severity?: "critical" | "high" | "warning" | "info";
  module?: string;
  category?: string;
  source?: string;
  title: string;
  message?: string;
  description?: string;
  businessId?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  httpStatus?: number | null;
  method?: string | null;
  path?: string | null;
  durationMs?: number | null;
  retryCount?: number;
  stackTrace?: string | null;
  rawLog?: string | null;
  requestHeaders?: Record<string, unknown>;
  requestBody?: unknown;
  responseBody?: unknown;
  terminal?: Record<string, unknown>;
  context?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  environment?: "production" | "preview" | "development" | "test";
  deploymentId?: string | null;
  commitHash?: string | null;
  appVersion?: string | null;
  region?: string | null;
  browser?: string | null;
  device?: string | null;
  ip?: string | null;
  country?: string | null;
  language?: string | null;
  rootCause?: string | null;
  suggestedFix?: string | null;
  impact?: string | null;
  recurrenceRisk?: string | null;
};

function buildFingerprint(input: ReportPlatformErrorInput): string {
  const base = [
    input.module ?? "platform",
    input.category ?? "runtime",
    input.title.trim().toLowerCase(),
    (input.message ?? "").trim().toLowerCase().slice(0, 240),
    input.path ?? "",
    String(input.httpStatus ?? ""),
  ].join("|");

  return createHash("sha256").update(base).digest("hex").slice(0, 32);
}

function resolveEnvironment(
  value: ReportPlatformErrorInput["environment"],
): "production" | "preview" | "development" | "test" {
  if (value) return value;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "development") return "development";
  if (process.env.NODE_ENV === "development") return "development";
  return "production";
}

/**
 * Upsert an error into Error Intelligence Center.
 * Groups by fingerprint and increments occurrences.
 */
export async function reportPlatformError(
  input: ReportPlatformErrorInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase not configured." };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, message: "Title is required." };
  }

  const fingerprint = buildFingerprint(input);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("platform_error_events")
    .select("id, occurrences, status")
    .eq("fingerprint", fingerprint)
    .in("status", ["open", "investigating"])
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { data: updated, error } = await admin
      .from("platform_error_events")
      .update({
        occurrences: (existing.occurrences ?? 1) + 1,
        last_seen_at: now,
        message: input.message?.trim() || undefined,
        stack_trace: input.stackTrace ?? undefined,
        raw_log: input.rawLog ?? undefined,
        http_status: input.httpStatus ?? undefined,
        duration_ms: input.durationMs ?? undefined,
        retry_count: input.retryCount ?? undefined,
        request_headers: input.requestHeaders
          ? asJson(input.requestHeaders)
          : undefined,
        request_body:
          input.requestBody !== undefined
            ? asJson(input.requestBody)
            : undefined,
        response_body:
          input.responseBody !== undefined
            ? asJson(input.responseBody)
            : undefined,
        terminal: input.terminal ? asJson(input.terminal) : undefined,
        context: input.context ? asJson(input.context) : undefined,
        ai: input.ai ? asJson(input.ai) : undefined,
      })
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, id: updated?.id ?? existing.id };
  }

  const { data: inserted, error } = await admin
    .from("platform_error_events")
    .insert({
      fingerprint,
      severity: input.severity ?? "high",
      status: "open",
      environment: resolveEnvironment(input.environment),
      module: input.module ?? "platform",
      category: input.category ?? "runtime",
      source: input.source ?? "app",
      title,
      message: input.message?.trim() ?? "",
      description: input.description?.trim() ?? "",
      root_cause: input.rootCause ?? null,
      suggested_fix: input.suggestedFix ?? null,
      impact: input.impact ?? null,
      recurrence_risk: input.recurrenceRisk ?? null,
      business_id: input.businessId ?? null,
      user_id: input.userId ?? null,
      conversation_id: input.conversationId ?? null,
      session_id: input.sessionId ?? null,
      correlation_id: input.correlationId ?? null,
      trace_id: input.traceId ?? null,
      deployment_id:
        input.deploymentId ?? process.env.VERCEL_DEPLOYMENT_ID ?? null,
      commit_hash: input.commitHash ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      app_version: input.appVersion ?? process.env.npm_package_version ?? null,
      region: input.region ?? process.env.VERCEL_REGION ?? null,
      http_status: input.httpStatus ?? null,
      method: input.method ?? null,
      path: input.path ?? null,
      duration_ms: input.durationMs ?? null,
      retry_count: input.retryCount ?? 0,
      browser: input.browser ?? null,
      device: input.device ?? null,
      ip: input.ip ?? null,
      country: input.country ?? null,
      language: input.language ?? null,
      request_headers: asJson(input.requestHeaders ?? {}),
      request_body:
        input.requestBody !== undefined ? asJson(input.requestBody) : null,
      response_body:
        input.responseBody !== undefined ? asJson(input.responseBody) : null,
      stack_trace: input.stackTrace ?? null,
      raw_log: input.rawLog ?? null,
      terminal: asJson(input.terminal ?? {}),
      context: asJson(input.context ?? {}),
      ai: asJson(input.ai ?? {}),
      first_seen_at: now,
      last_seen_at: now,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, id: inserted?.id };
}

/** Fire-and-forget helper for call sites that must not block. */
export function schedulePlatformErrorReport(
  input: ReportPlatformErrorInput,
): void {
  void reportPlatformError(input).catch((error) => {
    console.error(
      "[error-intelligence] failed to report",
      error instanceof Error ? error.message : error,
    );
  });
}
