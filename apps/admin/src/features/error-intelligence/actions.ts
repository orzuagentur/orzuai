"use server";

import { requirePlatformAdmin, createServiceRoleClient } from "@/lib/supabase/server";
import type {
  ErrorEnvironment,
  ErrorIntelligenceBusinessSnapshot,
  ErrorIntelligenceEvent,
  ErrorIntelligenceListFilters,
  ErrorIntelligenceStats,
  ErrorSeverity,
  ErrorStatus,
} from "@/features/error-intelligence/types";

type DbErrorRow = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mapEvent(
  row: DbErrorRow,
  businessName?: string | null,
): ErrorIntelligenceEvent {
  return {
    id: String(row.id),
    fingerprint: String(row.fingerprint ?? ""),
    severity: (row.severity as ErrorSeverity) ?? "high",
    status: (row.status as ErrorStatus) ?? "open",
    environment: (row.environment as ErrorEnvironment) ?? "production",
    module: String(row.module ?? "platform"),
    category: String(row.category ?? "runtime"),
    source: String(row.source ?? "app"),
    title: String(row.title ?? "Untitled error"),
    message: String(row.message ?? ""),
    description: String(row.description ?? ""),
    rootCause: asString(row.root_cause),
    suggestedFix: asString(row.suggested_fix),
    impact: asString(row.impact),
    recurrenceRisk: asString(row.recurrence_risk),
    businessId: asString(row.business_id),
    businessName: businessName ?? null,
    userId: asString(row.user_id),
    conversationId: asString(row.conversation_id),
    sessionId: asString(row.session_id),
    correlationId: asString(row.correlation_id),
    traceId: asString(row.trace_id),
    deploymentId: asString(row.deployment_id),
    commitHash: asString(row.commit_hash),
    appVersion: asString(row.app_version),
    region: asString(row.region),
    httpStatus: asNumber(row.http_status),
    method: asString(row.method),
    path: asString(row.path),
    durationMs: asNumber(row.duration_ms),
    retryCount: asNumber(row.retry_count) ?? 0,
    occurrences: asNumber(row.occurrences) ?? 1,
    assignedTo: asString(row.assigned_to),
    resolvedAt: asString(row.resolved_at),
    resolvedBy: asString(row.resolved_by),
    browser: asString(row.browser),
    device: asString(row.device),
    ip: asString(row.ip),
    country: asString(row.country),
    language: asString(row.language),
    requestHeaders: asRecord(row.request_headers),
    requestBody: row.request_body ?? null,
    responseBody: row.response_body ?? null,
    stackTrace: asString(row.stack_trace),
    rawLog: asString(row.raw_log),
    terminal: asRecord(row.terminal),
    context: asRecord(row.context),
    ai: asRecord(row.ai),
    firstSeenAt: String(row.first_seen_at ?? row.created_at),
    lastSeenAt: String(row.last_seen_at ?? row.created_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export async function fetchErrorIntelligenceEventsAction(
  filters: ErrorIntelligenceListFilters = {},
): Promise<
  | { success: true; events: ErrorIntelligenceEvent[]; total: number }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const limit = Math.min(Math.max(filters.limit ?? 120, 1), 300);

    let query = admin
      .from("platform_error_events")
      .select("*", { count: "exact" })
      .order("last_seen_at", { ascending: false })
      .limit(limit);

    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.module) query = query.eq("module", filters.module);
    if (filters.environment) query = query.eq("environment", filters.environment);
    if (filters.businessId) query = query.eq("business_id", filters.businessId);

    const search = filters.query?.trim();
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,message.ilike.%${search}%,module.ilike.%${search}%,category.ilike.%${search}%,fingerprint.ilike.%${search}%,path.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return { success: false, message: error.message };
    }

    const rows = (data ?? []) as DbErrorRow[];
    const businessIds = [
      ...new Set(
        rows
          .map((row) => asString(row.business_id))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const nameById = new Map<string, string>();
    if (businessIds.length > 0) {
      const { data: businesses } = await admin
        .from("businesses")
        .select("id, business_name")
        .in("id", businessIds);
      for (const business of businesses ?? []) {
        nameById.set(
          String(business.id),
          String(business.business_name ?? "Business"),
        );
      }
    }

    return {
      success: true,
      total: count ?? rows.length,
      events: rows.map((row) =>
        mapEvent(row, nameById.get(String(row.business_id ?? "")) ?? null),
      ),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load errors.",
    };
  }
}

export async function fetchErrorIntelligenceStatsAction(): Promise<
  | { success: true; stats: ErrorIntelligenceStats }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [
      critical,
      high,
      warning,
      resolvedToday,
      lastHour,
      lastDay,
      modules,
    ] = await Promise.all([
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .eq("severity", "critical")
        .in("status", ["open", "investigating"]),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .eq("severity", "high")
        .in("status", ["open", "investigating"]),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .eq("severity", "warning")
        .in("status", ["open", "investigating"]),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved")
        .gte("resolved_at", dayStart.toISOString()),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", hourAgo),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .gte("last_seen_at", dayAgo),
      admin
        .from("platform_error_events")
        .select("module")
        .gte("last_seen_at", dayAgo)
        .limit(500),
    ]);

    const moduleCounts = new Map<string, number>();
    for (const row of modules.data ?? []) {
      const key = String(row.module ?? "platform");
      moduleCounts.set(key, (moduleCounts.get(key) ?? 0) + 1);
    }

    return {
      success: true,
      stats: {
        openCritical: critical.count ?? 0,
        openHigh: high.count ?? 0,
        openWarning: warning.count ?? 0,
        resolvedToday: resolvedToday.count ?? 0,
        lastHour: lastHour.count ?? 0,
        lastDay: lastDay.count ?? 0,
        topModules: [...moduleCounts.entries()]
          .map(([module, count]) => ({ module, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load stats.",
    };
  }
}

export async function fetchErrorBusinessSnapshotAction(
  businessId: string,
): Promise<
  | { success: true; snapshot: ErrorIntelligenceBusinessSnapshot }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();

    const { data: business, error } = await admin
      .from("businesses")
      .select(
        "id, business_name, phone, email, subscription_plan, subscription_status, created_at, user_id, logo_url",
      )
      .eq("id", businessId)
      .maybeSingle();

    if (error || !business) {
      return { success: false, message: error?.message ?? "Business not found." };
    }

    const [
      contacts,
      conversations,
      openErrors,
      recentErrors,
      owner,
    ] = await Promise.all([
      admin
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      admin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      admin
        .from("platform_error_events")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["open", "investigating"]),
      admin
        .from("platform_error_events")
        .select("title")
        .eq("business_id", businessId)
        .order("last_seen_at", { ascending: false })
        .limit(8),
      business.user_id
        ? admin.auth.admin.getUserById(String(business.user_id))
        : Promise.resolve({ data: { user: null } }),
    ]);

    return {
      success: true,
      snapshot: {
        id: String(business.id),
        name: String(business.business_name ?? "Business"),
        ownerEmail:
          owner.data.user?.email ??
          (typeof business.email === "string" ? business.email : null),
        ownerName:
          (owner.data.user?.user_metadata?.full_name as string | undefined) ??
          null,
        phone: typeof business.phone === "string" ? business.phone : null,
        plan:
          typeof business.subscription_plan === "string"
            ? business.subscription_plan
            : null,
        status:
          typeof business.subscription_status === "string"
            ? business.subscription_status
            : "active",
        createdAt: asString(business.created_at),
        contactsCount: contacts.count ?? 0,
        messagesCount: 0,
        conversationsCount: conversations.count ?? 0,
        openErrorsCount: openErrors.count ?? 0,
        recentErrorTitles: (recentErrors.data ?? []).map((row) =>
          String(row.title),
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to load business.",
    };
  }
}

export async function updateErrorEventStatusAction(input: {
  id: string;
  status: ErrorStatus;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { user } = await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const patch: Record<string, unknown> = {
      status: input.status,
    };

    if (input.status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user.id;
    } else {
      patch.resolved_at = null;
      patch.resolved_by = null;
    }

    const { error } = await admin
      .from("platform_error_events")
      .update(patch)
      .eq("id", input.id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update.",
    };
  }
}

export async function bulkUpdateErrorEventsAction(input: {
  ids: string[];
  status: ErrorStatus;
}): Promise<{ success: boolean; message?: string; updated?: number }> {
  try {
    const { user } = await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    if (input.ids.length === 0) {
      return { success: false, message: "No events selected." };
    }

    const patch: Record<string, unknown> = { status: input.status };
    if (input.status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user.id;
    }

    const { data, error } = await admin
      .from("platform_error_events")
      .update(patch)
      .in("id", input.ids)
      .select("id");

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, updated: data?.length ?? 0 };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update.",
    };
  }
}

export async function deleteErrorEventsAction(input: {
  ids: string[];
}): Promise<{ success: boolean; message?: string; deleted?: number }> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    if (input.ids.length === 0) {
      return { success: false, message: "No events selected." };
    }

    const { data, error } = await admin
      .from("platform_error_events")
      .delete()
      .in("id", input.ids)
      .select("id");

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, deleted: data?.length ?? 0 };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to delete.",
    };
  }
}

export async function seedDemoErrorEventsAction(): Promise<{
  success: boolean;
  message?: string;
  created?: number;
}> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();

    const demos = [
      {
        fingerprint: `demo-vapid-${Date.now()}`,
        severity: "high",
        module: "platform",
        category: "push",
        source: "push-notifications",
        title: "VAPID subject invalid",
        message: "Vapid subject is not an https: or mailto: URL.",
        description: "Web push configuration rejected invalid contact URI.",
        root_cause: "VAPID_SUBJECT was set to http://localhost:3000",
        suggested_fix: "Set VAPID_SUBJECT=mailto:support@orzux.com",
        impact: "Push notifications for agent actions fail silently.",
        recurrence_risk: "High until env is corrected.",
        stack_trace:
          "Error: Vapid subject is not an https: or mailto: URL.\n    at validateSubject\n    at setVapidDetails",
        raw_log: "[push] failed to notify agent action",
        terminal: {
          runtime: "nodejs",
          console: ["[push] failed to notify agent action"],
        },
        context: { envKey: "VAPID_SUBJECT" },
        path: "/api/internal/agent-action",
        http_status: 500,
      },
      {
        fingerprint: `demo-ai-json-${Date.now()}`,
        severity: "warning",
        module: "ai",
        category: "parsing",
        source: "gemini",
        title: "AI returned invalid JSON",
        message: "Model completion was not valid JSON for tool call.",
        description: "Parser rejected model output during CRM tool execution.",
        root_cause: "Model wrapped JSON in markdown fences or truncated.",
        suggested_fix: "Retry with stricter schema and lower temperature.",
        impact: "CRM auto-update skipped for one turn.",
        recurrence_risk: "Medium",
        ai: {
          model: "gemini-2.5-flash",
          latencyMs: 1840,
          confidence: 0.42,
          tokensIn: 2100,
          tokensOut: 180,
        },
        terminal: {
          prompt: "Extract CRM fields as JSON...",
          completion: "```json\n{ incomplete",
        },
      },
      {
        fingerprint: `demo-whatsapp-${Date.now()}`,
        severity: "critical",
        module: "whatsapp",
        category: "delivery",
        source: "360dialog",
        title: "WhatsApp delivery failed",
        message: "Template rejected by Meta.",
        description: "Outbound template message could not be delivered.",
        root_cause: "Template language mismatch or unapproved template.",
        suggested_fix: "Verify template status in Meta Business Manager.",
        impact: "Customer did not receive confirmation message.",
        recurrence_risk: "High for this template",
        http_status: 400,
        path: "/api/webhooks/whatsapp",
        response_body: { error: "template_rejected" },
      },
    ];

    const { data, error } = await admin
      .from("platform_error_events")
      .insert(
        demos.map((demo) => ({
          ...demo,
          status: "open",
          environment: "production",
          first_seen_at: now,
          last_seen_at: now,
          occurrences: 1,
          request_headers: {},
          context: demo.context ?? {},
          terminal: demo.terminal ?? {},
          ai: demo.ai ?? {},
        })),
      )
      .select("id");

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, created: data?.length ?? 0 };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to seed demos.",
    };
  }
}
