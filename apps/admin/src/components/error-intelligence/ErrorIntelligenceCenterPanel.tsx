"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  FilterIcon,
  Loader2Icon,
  RadarIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  bulkUpdateErrorEventsAction,
  deleteErrorEventsAction,
  fetchErrorBusinessSnapshotAction,
  fetchErrorIntelligenceEventsAction,
  fetchErrorIntelligenceStatsAction,
  seedDemoErrorEventsAction,
  updateErrorEventStatusAction,
} from "@/features/error-intelligence/actions";
import {
  ERROR_ENVIRONMENTS,
  ERROR_MODULES,
  ERROR_SEVERITIES,
  ERROR_STATUSES,
  rowAccentClass,
  severityTone,
  statusTone,
  type ErrorEnvironment,
  type ErrorIntelligenceBusinessSnapshot,
  type ErrorIntelligenceEvent,
  type ErrorIntelligenceStats,
  type ErrorSeverity,
  type ErrorStatus,
} from "@/features/error-intelligence/types";
import { formatAdminDateTime } from "@/lib/format-datetime";
import { buildCsvContent, downloadCsv } from "@/lib/csv-download";
import { cn } from "@/lib/utils";
import { createAdminSupabaseBrowserClient } from "@/lib/supabase/client";

function formatRelativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

function TerminalBlock({
  title,
  value,
  defaultOpen = false,
}: {
  title: string;
  value: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!value.trim()) return null;

  return (
    <div className="rounded-lg border bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
        <button
          type="button"
          className="text-left text-xs font-medium tracking-wide text-zinc-300 uppercase"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "▾" : "▸"} {title}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => copyText(title, value)}
        >
          <CopyIcon className="size-3" />
          Copy
        </button>
      </div>
      {open ? (
        <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap">
          {value}
        </pre>
      ) : null}
    </div>
  );
}

export function ErrorIntelligenceCenterPanel() {
  const [events, setEvents] = useState<ErrorIntelligenceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ErrorIntelligenceStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapshot, setSnapshot] =
    useState<ErrorIntelligenceBusinessSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<ErrorSeverity | "">("");
  const [status, setStatus] = useState<ErrorStatus | "">("open");
  const [moduleFilter, setModuleFilter] = useState("");
  const [environment, setEnvironment] = useState<ErrorEnvironment | "">("");
  const [isPending, startTransition] = useTransition();
  const [terminalQuery, setTerminalQuery] = useState("");

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

  const load = useCallback(() => {
    startTransition(async () => {
      const [listResult, statsResult] = await Promise.all([
        fetchErrorIntelligenceEventsAction({
          query,
          severity,
          status,
          module: moduleFilter || undefined,
          environment,
          limit: 200,
        }),
        fetchErrorIntelligenceStatsAction(),
      ]);

      if (!listResult.success) {
        toast.error(listResult.message);
        return;
      }

      setEvents(listResult.events);
      setTotal(listResult.total);
      if (!selectedId && listResult.events[0]) {
        setSelectedId(listResult.events[0].id);
      }

      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    });
  }, [environment, moduleFilter, query, selectedId, severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected?.businessId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await fetchErrorBusinessSnapshotAction(selected.businessId!);
      if (!cancelled && result.success) {
        setSnapshot(result.snapshot);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.businessId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      load();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    try {
      const supabase = createAdminSupabaseBrowserClient();
      const channel = supabase
        .channel("platform-error-events")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "platform_error_events" },
          () => {
            load();
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      return undefined;
    }
  }, [load]);

  const filteredTerminal = useMemo(() => {
    if (!selected) return [];
    const blocks: Array<{ title: string; value: string; open?: boolean }> = [
      { title: "Stack Trace", value: selected.stackTrace ?? "", open: true },
      { title: "Raw Log", value: selected.rawLog ?? "", open: true },
      {
        title: "Request Headers",
        value: prettyJson(selected.requestHeaders),
      },
      { title: "Request Body", value: prettyJson(selected.requestBody) },
      { title: "Response Body", value: prettyJson(selected.responseBody) },
      { title: "Terminal", value: prettyJson(selected.terminal), open: true },
      { title: "Context", value: prettyJson(selected.context) },
      { title: "AI", value: prettyJson(selected.ai) },
    ];

    const q = terminalQuery.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter(
      (block) =>
        block.title.toLowerCase().includes(q) ||
        block.value.toLowerCase().includes(q),
    );
  }, [selected, terminalQuery]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function handleStatus(next: ErrorStatus, ids?: string[]) {
    const targetIds = ids ?? (selected ? [selected.id] : selectedIds);
    if (targetIds.length === 0) return;

    const result =
      targetIds.length === 1
        ? await updateErrorEventStatusAction({ id: targetIds[0]!, status: next })
        : await bulkUpdateErrorEventsAction({ ids: targetIds, status: next });

    if (!result.success) {
      toast.error(result.message ?? "Update failed");
      return;
    }

    toast.success(`Marked as ${next}`);
    setSelectedIds([]);
    load();
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4">
      <PageHeader
        title="Error Intelligence Center"
        description="Единый центр мониторинга, диагностики и анализа сбоев всей платформы ORZUAI"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
              onClick={() => load()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Refresh
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
              onClick={() => {
                startTransition(async () => {
                  const result = await seedDemoErrorEventsAction();
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(`Seeded ${result.created ?? 0} demo events`);
                  load();
                });
              }}
            >
              <RadarIcon className="size-4" />
              Seed demos
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
              disabled={events.length === 0}
              onClick={() => {
                const csv = buildCsvContent(
                  [
                    "last_seen_at",
                    "severity",
                    "status",
                    "module",
                    "category",
                    "title",
                    "business",
                    "occurrences",
                    "environment",
                  ],
                  events.map((event) => [
                    event.lastSeenAt,
                    event.severity,
                    event.status,
                    event.module,
                    event.category,
                    event.title,
                    event.businessName ?? "",
                    String(event.occurrences),
                    event.environment,
                  ]),
                );
                downloadCsv(`error-intelligence-${Date.now()}.csv`, csv);
              }}
            >
              Export CSV
            </button>
          </div>
        }
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label: "Critical open",
              value: stats.openCritical,
              tone: "text-rose-600",
            },
            {
              label: "High open",
              value: stats.openHigh,
              tone: "text-orange-600",
            },
            {
              label: "Warnings",
              value: stats.openWarning,
              tone: "text-amber-600",
            },
            {
              label: "Resolved today",
              value: stats.resolvedToday,
              tone: "text-emerald-600",
            },
            { label: "Last hour", value: stats.lastHour, tone: "text-sky-600" },
            { label: "Last 24h", value: stats.lastDay, tone: "text-violet-600" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-card px-4 py-3 shadow-none"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", item.tone)}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search business, module, title, path, fingerprint…"
            className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm"
          />
        </div>
        <FilterIcon className="size-4 text-muted-foreground" />
        <select
          value={severity}
          onChange={(event) =>
            setSeverity(event.target.value as ErrorSeverity | "")
          }
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">All severities</option>
          {ERROR_SEVERITIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ErrorStatus | "")}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">All statuses</option>
          {ERROR_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">All modules</option>
          {ERROR_MODULES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={environment}
          onChange={(event) =>
            setEnvironment(event.target.value as ErrorEnvironment | "")
          }
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">All envs</option>
          {ERROR_ENVIRONMENTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{total} events</span>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <button
            type="button"
            className="rounded-md border bg-background px-2 py-1 text-xs"
            onClick={() => void handleStatus("resolved", selectedIds)}
          >
            Resolve
          </button>
          <button
            type="button"
            className="rounded-md border bg-background px-2 py-1 text-xs"
            onClick={() => void handleStatus("ignored", selectedIds)}
          >
            Ignore
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-rose-700"
            onClick={() => {
              startTransition(async () => {
                const result = await deleteErrorEventsAction({
                  ids: selectedIds,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success(`Deleted ${result.deleted ?? 0}`);
                setSelectedIds([]);
                load();
              });
            }}
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(280px,1.1fr)_minmax(320px,1.3fr)_minmax(240px,0.9fr)]">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Errors stream
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={AlertTriangleIcon}
                  title="No errors yet"
                  description="Errors from the whole platform will appear here automatically. Use Seed demos to preview the UI."
                />
              </div>
            ) : (
              events.map((event) => {
                const active = event.id === selectedId;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex border-b border-l-4",
                      rowAccentClass(event.severity, event.status),
                      active ? "bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    <label className="flex items-start px-2 pt-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(event.id)}
                        onChange={() => toggleSelected(event.id)}
                      />
                    </label>
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-2 py-3 text-left"
                      onClick={() => setSelectedId(event.id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            severityTone(event.severity),
                          )}
                        >
                          {event.severity}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            statusTone(event.status),
                          )}
                        >
                          {event.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ×{event.occurrences}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {event.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.module} · {event.category}
                        {event.businessName ? ` · ${event.businessName}` : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatRelativeTime(event.lastSeenAt)} ·{" "}
                        {formatAdminDateTime(event.lastSeenAt)}
                      </p>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Error analysis
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!selected ? (
              <EmptyState
                icon={ActivityIcon}
                title="Select an error"
                description="Pick an event from the stream to inspect root cause, traces, and terminal data."
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        severityTone(selected.severity),
                      )}
                    >
                      {selected.severity}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusTone(selected.status),
                      )}
                    >
                      {selected.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selected.environment} · {selected.source}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.message || selected.description || "No message"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() => void handleStatus("resolved")}
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() => void handleStatus("investigating")}
                  >
                    Investigating
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() => void handleStatus("ignored")}
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() =>
                      copyText("Fingerprint", selected.fingerprint)
                    }
                  >
                    Copy fingerprint
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Module", selected.module],
                    ["Category", selected.category],
                    ["Occurrences", String(selected.occurrences)],
                    ["HTTP", selected.httpStatus ? String(selected.httpStatus) : "—"],
                    ["Path", selected.path ?? "—"],
                    ["Duration", selected.durationMs != null ? `${selected.durationMs}ms` : "—"],
                    ["Trace ID", selected.traceId ?? "—"],
                    ["Correlation", selected.correlationId ?? "—"],
                    ["Session", selected.sessionId ?? "—"],
                    ["Conversation", selected.conversationId ?? "—"],
                    ["Deployment", selected.deploymentId ?? "—"],
                    ["Commit", selected.commitHash?.slice(0, 8) ?? "—"],
                    ["Version", selected.appVersion ?? "—"],
                    ["Region", selected.region ?? "—"],
                    ["Browser", selected.browser ?? "—"],
                    ["Device", selected.device ?? "—"],
                    ["IP", selected.ip ?? "—"],
                    ["Country", selected.country ?? "—"],
                    ["First seen", formatAdminDateTime(selected.firstSeenAt)],
                    ["Last seen", formatAdminDateTime(selected.lastSeenAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border bg-muted/20 p-2.5">
                      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="mt-1 break-all text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-xl border bg-muted/15 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Root cause analysis
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Why: </span>
                    {selected.rootCause ??
                      "Automatic analysis pending — inspect terminal and stack below."}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Fix: </span>
                    {selected.suggestedFix ?? "No suggested fix yet."}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Impact: </span>
                    {selected.impact ?? "Impact not assessed."}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Recurrence: </span>
                    {selected.recurrenceRisk ?? "Unknown"}
                  </p>
                </div>

                {Object.keys(selected.ai).length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(selected.ai).map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-2.5 text-sm">
                        <p className="text-[10px] text-muted-foreground uppercase">
                          AI · {key}
                        </p>
                        <p className="mt-1 font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Business context
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!selected?.businessId ? (
              <EmptyState
                title="No business linked"
                description="Platform-level events may not belong to a tenant. Business metrics appear when business_id is present."
              />
            ) : !snapshot ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading business…
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{snapshot.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {snapshot.plan ?? "plan unknown"} · {snapshot.status}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Owner: </span>
                    {snapshot.ownerName ?? "—"} ({snapshot.ownerEmail ?? "—"})
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone: </span>
                    {snapshot.phone ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Registered: </span>
                    {snapshot.createdAt
                      ? formatAdminDateTime(snapshot.createdAt)
                      : "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Contacts", snapshot.contactsCount],
                    ["Conversations", snapshot.conversationsCount],
                    ["Open errors", snapshot.openErrorsCount],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Recent errors
                  </p>
                  <ul className="space-y-1.5">
                    {snapshot.recentErrorTitles.map((title) => (
                      <li
                        key={title}
                        className="truncate rounded-md border bg-muted/20 px-2 py-1.5 text-xs"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Terminal
          </p>
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={terminalQuery}
              onChange={(event) => setTerminalQuery(event.target.value)}
              placeholder="Search terminal blocks…"
              className="h-8 w-full rounded-md border bg-background pr-2 pl-8 text-xs"
            />
          </div>
        </div>
        <div className="grid max-h-80 gap-2 overflow-y-auto bg-zinc-900/95 p-3 md:grid-cols-2">
          {!selected ? (
            <p className="col-span-full p-4 text-center text-sm text-zinc-400">
              Select an error to inspect stack, payloads, and runtime output.
            </p>
          ) : filteredTerminal.length === 0 ? (
            <p className="col-span-full p-4 text-center text-sm text-zinc-400">
              No terminal blocks match your search.
            </p>
          ) : (
            filteredTerminal.map((block) => (
              <TerminalBlock
                key={block.title}
                title={block.title}
                value={block.value}
                defaultOpen={Boolean(block.open)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
