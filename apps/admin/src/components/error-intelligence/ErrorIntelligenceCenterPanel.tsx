"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  EyeIcon,
  FunctionSquareIcon,
  GlobeIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  SquareStackIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteErrorEventsAction,
  fetchErrorBusinessSnapshotAction,
  fetchErrorIntelligenceEventsAction,
  fetchErrorIntelligenceStatsAction,
  updateErrorEventStatusAction,
} from "@/features/error-intelligence/actions";
import {
  ERROR_ENVIRONMENTS,
  ERROR_MODULES,
  ERROR_STATUSES,
  type ErrorEnvironment,
  type ErrorIntelligenceBusinessSnapshot,
  type ErrorIntelligenceEvent,
  type ErrorIntelligenceStats,
  type ErrorSeverity,
  type ErrorStatus,
} from "@/features/error-intelligence/types";
import { cn } from "@/lib/utils";
import {
  formatAdminLogTick,
  formatAdminLogTimestamp,
} from "@/lib/format-datetime";
import { createAdminSupabaseBrowserClient } from "@/lib/supabase/client";

const SEVERITY_LEVELS: Array<{
  id: ErrorSeverity;
  label: string;
  dot: string;
}> = [
  { id: "warning", label: "Warning", dot: "bg-amber-400" },
  { id: "high", label: "Error", dot: "bg-orange-500" },
  { id: "critical", label: "Fatal", dot: "bg-rose-500" },
  { id: "info", label: "Info", dot: "bg-sky-400" },
];

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

function statusCodeClass(code: number | null): string {
  if (code == null) return "text-muted-foreground";
  if (code >= 500) return "text-rose-600 dark:text-rose-400";
  if (code >= 400) return "text-amber-600 dark:text-amber-400";
  if (code >= 200 && code < 300) return "text-emerald-600 dark:text-emerald-400";
  return "text-foreground";
}

function severityDot(severity: ErrorSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-rose-500";
    case "high":
      return "bg-orange-500";
    case "warning":
      return "bg-amber-400";
    default:
      return "bg-sky-400";
  }
}

function buildHistogram(events: ErrorIntelligenceEvent[], buckets = 48) {
  if (events.length === 0) {
    return { bars: Array.from({ length: buckets }, () => 0), ticks: [] as string[] };
  }

  const times = events
    .map((e) => new Date(e.lastSeenAt).getTime())
    .filter(Number.isFinite);
  const max = Math.max(...times);
  const min = Math.min(...times, max - 15 * 60 * 1000);
  const span = Math.max(max - min, 60_000);
  const bars = Array.from({ length: buckets }, () => 0);

  for (const time of times) {
    const index = Math.min(
      buckets - 1,
      Math.max(0, Math.floor(((time - min) / span) * buckets)),
    );
    bars[index] += 1;
  }

  const ticks = [0, Math.floor(buckets / 2), buckets - 1].map((i) =>
    formatAdminLogTick(
      new Date(min + (span * i) / Math.max(buckets - 1, 1)).toISOString(),
    ),
  );

  return { bars, ticks };
}

function FilterAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/70">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="space-y-1 px-3 pb-3">{children}</div> : null}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value.trim() || value === "—") return null;
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 py-0.5 font-mono text-[11px] leading-5">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-foreground/90">{value}</span>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  badge,
  badgeClassName,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">{title}</span>
          {badge ? (
            <span
              className={cn(
                "font-mono text-[10px] font-medium",
                badgeClassName,
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorIntelligenceCenterPanel() {
  const [events, setEvents] = useState<ErrorIntelligenceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ErrorIntelligenceStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [severities, setSeverities] = useState<ErrorSeverity[]>([
    "critical",
    "high",
    "warning",
  ]);
  const [statuses, setStatuses] = useState<ErrorStatus[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<ErrorEnvironment[]>([]);
  const [detailOpen, setDetailOpen] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [snapshot, setSnapshot] =
    useState<ErrorIntelligenceBusinessSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedIndex = useMemo(
    () => events.findIndex((event) => event.id === selectedId),
    [events, selectedId],
  );
  const selected = selectedIndex >= 0 ? events[selectedIndex]! : null;
  const histogram = useMemo(() => buildHistogram(events), [events]);
  const maxBar = Math.max(...histogram.bars, 1);

  const severityCounts = useMemo(
    () => ({
      critical: stats?.openCritical ?? 0,
      high: stats?.openHigh ?? 0,
      warning: stats?.openWarning ?? 0,
      info: events.filter((e) => e.severity === "info").length,
    }),
    [events, stats],
  );

  const load = useCallback(() => {
    startTransition(async () => {
      const [listResult, statsResult] = await Promise.all([
        fetchErrorIntelligenceEventsAction({
          query,
          severity: severities.length > 0 ? severities : undefined,
          status: statuses.length > 0 ? statuses : undefined,
          module: modules.length > 0 ? modules : undefined,
          environment: environments.length > 0 ? environments : undefined,
          limit: 250,
        }),
        fetchErrorIntelligenceStatsAction(),
      ]);

      if (!listResult.success) {
        toast.error(listResult.message);
        return;
      }

      setEvents(listResult.events);
      setTotal(listResult.total);
      setSelectedId((current) => {
        if (current && listResult.events.some((e) => e.id === current)) {
          return current;
        }
        return listResult.events[0]?.id ?? null;
      });

      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    });
  }, [environments, modules, query, severities, statuses]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => load(), 15000);
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
          () => load(),
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      return undefined;
    }
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
      if (!cancelled && !result.success) {
        setSnapshot(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.businessId]);

  useEffect(() => {
    setOverviewOpen(false);
  }, [selectedId]);

  function toggleSeverity(value: ErrorSeverity) {
    setSeverities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleInList<T extends string>(
    value: T,
    current: T[],
    setter: (next: T[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function selectAdjacent(delta: number) {
    if (events.length === 0) return;
    const next = Math.min(
      events.length - 1,
      Math.max(0, (selectedIndex < 0 ? 0 : selectedIndex) + delta),
    );
    setSelectedId(events[next]!.id);
    setDetailOpen(true);
  }

  async function handleStatus(next: ErrorStatus) {
    if (!selected) return;
    const result = await updateErrorEventStatusAction({
      id: selected.id,
      status: next,
    });
    if (!result.success) {
      toast.error(result.message ?? "Update failed");
      return;
    }
    toast.success(`Marked as ${next}`);
    load();
  }

  return (
    <div className="flex h-full max-h-full min-h-0 overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-[220px] shrink-0 flex-col overflow-hidden border-r lg:flex">
        <div className="border-b px-3 py-3">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Runtime Console
          </p>
        </div>

        <div className="border-b px-3 py-3">
          <p className="mb-2 text-[11px] text-muted-foreground">Level</p>
          <div className="space-y-1.5">
            {SEVERITY_LEVELS.map((level) => (
              <label
                key={level.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="size-3.5 rounded border"
                  checked={severities.includes(level.id)}
                  onChange={() => toggleSeverity(level.id)}
                />
                <span className={cn("size-1.5 rounded-full", level.dot)} />
                <span className="flex-1">{level.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {severityCounts[level.id]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FilterAccordion title="Status" defaultOpen>
            {ERROR_STATUSES.map((status) => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs capitalize hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="size-3.5 rounded border"
                  checked={statuses.includes(status)}
                  onChange={() => toggleInList(status, statuses, setStatuses)}
                />
                {status}
              </label>
            ))}
          </FilterAccordion>

          <FilterAccordion title="Environment" defaultOpen>
            {ERROR_ENVIRONMENTS.map((env) => (
              <label
                key={env}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs capitalize hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="size-3.5 rounded border"
                  checked={environments.includes(env)}
                  onChange={() =>
                    toggleInList(env, environments, setEnvironments)
                  }
                />
                {env}
              </label>
            ))}
          </FilterAccordion>

          <FilterAccordion title="Module">
            {ERROR_MODULES.map((module) => (
              <label
                key={module}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="size-3.5 rounded border"
                  checked={modules.includes(module)}
                  onChange={() => toggleInList(module, modules, setModules)}
                />
                {module}
              </label>
            ))}
          </FilterAccordion>
        </div>

        <div className="border-t px-3 py-3">
          <p className="truncate text-[11px] text-muted-foreground">
            OrzuAI · {total} events
          </p>
        </div>
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-foreground/80" />
            <span className="truncate text-sm font-medium">orzuai</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Logs</span>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => load()}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3.5" />
            )}
          </button>
        </div>

        <div className="shrink-0 border-b px-4 py-3">
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(draftQuery.trim());
            }}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search logs..."
              className="h-9 w-full rounded-md border bg-muted/20 pr-3 pl-9 text-sm outline-none focus:border-foreground/30"
            />
          </form>

          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              {histogram.ticks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div className="flex h-10 items-end gap-px">
              {histogram.bars.map((value, index) => (
                <div
                  key={index}
                  className="min-w-0 flex-1 rounded-t-[1px] bg-foreground/25"
                  style={{
                    height: `${Math.max(value > 0 ? 12 : 2, Math.round((value / maxBar) * 100))}%`,
                    opacity: value > 0 ? 0.85 : 0.2,
                  }}
                  title={`${value}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b text-[10px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Host</th>
                <th className="px-3 py-2 font-medium">Request</th>
                <th className="px-4 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    {isPending ? "Loading logs…" : "No logs match these filters."}
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const active = event.id === selectedId;
                  const method = (event.method ?? "ERR").toUpperCase();
                  const code = event.httpStatus;
                  return (
                    <tr
                      key={event.id}
                      className={cn(
                        "cursor-pointer border-b border-border/50 transition-colors",
                        active ? "bg-sky-500/10" : "hover:bg-muted/40",
                      )}
                      onClick={() => {
                        setSelectedId(event.id);
                        setDetailOpen(true);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              severityDot(event.severity),
                            )}
                          />
                          {formatAdminLogTimestamp(event.lastSeenAt)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="text-foreground/80">{method}</span>{" "}
                        <span className={statusCodeClass(code)}>
                          {code ?? "---"}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground">
                        {event.source || event.environment}
                      </td>
                      <td className="max-w-[220px] px-3 py-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <SquareStackIcon className="size-3 shrink-0 text-muted-foreground" />
                          <FunctionSquareIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {event.path || `/${event.module}/${event.category}`}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[360px] truncate px-4 py-2 text-muted-foreground">
                        {event.title || event.message || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="shrink-0 border-t bg-background px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Building2Icon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium">
                    {snapshot?.name ||
                      selected.businessName ||
                      (selected.businessId ? "Business" : "Platform error")}
                  </p>
                  {selected.businessId ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {selected.businessId.slice(0, 8)}…
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      no business linked
                    </span>
                  )}
                </div>
                {snapshot ? (
                  <div className="grid gap-x-6 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <p>
                      Owner:{" "}
                      <span className="text-foreground/90">
                        {snapshot.ownerName || snapshot.ownerEmail || "—"}
                      </span>
                    </p>
                    <p>
                      Email:{" "}
                      <span className="text-foreground/90">
                        {snapshot.ownerEmail || "—"}
                      </span>
                    </p>
                    <p>
                      Phone:{" "}
                      <span className="text-foreground/90">
                        {snapshot.phone || "—"}
                      </span>
                    </p>
                    <p>
                      Plan:{" "}
                      <span className="text-foreground/90">
                        {snapshot.plan || "—"} / {snapshot.status || "—"}
                      </span>
                    </p>
                    <p>
                      Contacts:{" "}
                      <span className="text-foreground/90">
                        {snapshot.contactsCount}
                      </span>
                    </p>
                    <p>
                      Conversations:{" "}
                      <span className="text-foreground/90">
                        {snapshot.conversationsCount}
                      </span>
                    </p>
                    <p>
                      Open errors:{" "}
                      <span className="text-foreground/90">
                        {snapshot.openErrorsCount}
                      </span>
                    </p>
                    <p className="truncate">
                      Recent:{" "}
                      <span className="text-foreground/90">
                        {snapshot.recentErrorTitles[0] || "—"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {selected.title} · {selected.module}/{selected.category}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"
                onClick={() => setOverviewOpen(true)}
              >
                <EyeIcon className="size-3.5" />
                Обзор
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selected && detailOpen ? (
        <aside className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden border-l xl:flex">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <p className="min-w-0 truncate font-mono text-xs font-medium">
              {(selected.method ?? "ERR").toUpperCase()}{" "}
              {selected.path || `/${selected.module}`}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => selectAdjacent(-1)}
                aria-label="Previous"
              >
                <ChevronUpIcon className="size-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => selectAdjacent(1)}
                aria-label="Next"
              >
                <ChevronDownIcon className="size-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() =>
                  copyText(
                    "Event",
                    prettyJson({
                      id: selected.id,
                      title: selected.title,
                      message: selected.message,
                      path: selected.path,
                      stackTrace: selected.stackTrace,
                    }),
                  )
                }
                aria-label="Copy"
              >
                <CopyIcon className="size-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setDetailOpen(false)}
                aria-label="Close"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", severityDot(selected.severity))}
              />
              <div>
                <p className="text-xs font-medium">Request started</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatAdminLogTimestamp(selected.firstSeenAt)}
                </p>
              </div>
            </div>

            <div className="mb-5">
              <MetaRow label="Request ID" value={selected.id} />
              <MetaRow
                label="Path"
                value={
                  selected.path || `/${selected.module}/${selected.category}`
                }
              />
              <MetaRow label="Host" value={selected.source} />
              <MetaRow label="Business" value={snapshot?.name || selected.businessName || ""} />
              <MetaRow label="User Agent" value={selected.browser ?? ""} />
            </div>

            <div className="mb-5">
              <TimelineItem
                icon={<GlobeIcon className="size-3.5" />}
                title={
                  selected.region
                    ? `Received in ${selected.region}`
                    : selected.country
                      ? `Received in ${selected.country}`
                      : "Received on platform"
                }
              />
              <TimelineItem
                icon={<ShieldIcon className="size-3.5" />}
                title="Severity"
                badge={selected.severity}
                badgeClassName={cn(
                  selected.severity === "critical" && "text-rose-600",
                  selected.severity === "high" && "text-orange-600",
                  selected.severity === "warning" && "text-amber-600",
                  selected.severity === "info" && "text-sky-600",
                )}
              />
              <TimelineItem
                icon={<SquareStackIcon className="size-3.5" />}
                title="Module"
                badge={selected.status}
                badgeClassName="text-emerald-600"
              >
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {selected.module} / {selected.category}
                </p>
              </TimelineItem>
              <TimelineItem
                icon={<FunctionSquareIcon className="size-3.5" />}
                title="Function Invocation"
                badge={
                  selected.durationMs != null
                    ? `${selected.durationMs}ms`
                    : `${selected.occurrences}×`
                }
                badgeClassName="text-muted-foreground"
              >
                {selected.message ? (
                  <p className="mt-1 font-mono text-[11px] leading-4 text-muted-foreground">
                    {selected.message}
                  </p>
                ) : null}
              </TimelineItem>
            </div>

            <button
              type="button"
              className="mb-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-xs font-medium hover:bg-muted"
              onClick={() => setOverviewOpen(true)}
            >
              <EyeIcon className="size-3.5" />
              Обзор
            </button>

            <div className="flex flex-wrap gap-3 border-t pt-3 text-[11px]">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void handleStatus("investigating")}
              >
                Investigate
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void handleStatus("resolved")}
              >
                Resolve
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void handleStatus("ignored")}
              >
                Ignore
              </button>
              <button
                type="button"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteErrorEventsAction({
                      ids: [selected.id],
                    });
                    if (!result.success) {
                      toast.error(result.message ?? "Delete failed");
                      return;
                    }
                    toast.success("Deleted");
                    setSelectedId(null);
                    load();
                  });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {selected && overviewOpen ? (
        <ErrorOverviewModal
          event={selected}
          snapshot={snapshot}
          onClose={() => setOverviewOpen(false)}
          onStatus={(status) => void handleStatus(status)}
        />
      ) : null}
    </div>
  );
}

function ErrorOverviewModal({
  event,
  snapshot,
  onClose,
  onStatus,
}: {
  event: ErrorIntelligenceEvent;
  snapshot: ErrorIntelligenceBusinessSnapshot | null;
  onClose: () => void;
  onStatus: (status: ErrorStatus) => void;
}) {
  const codeBlock =
    event.stackTrace ||
    event.rawLog ||
    prettyJson({
      message: event.message,
      context: event.context,
      ai: event.ai,
      terminal: event.terminal,
      requestBody: event.requestBody,
      responseBody: event.responseBody,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={cn("size-2 rounded-full", severityDot(event.severity))}
              />
              <p className="text-sm font-semibold">{event.title}</p>
              <span className={cn("font-mono text-xs", statusCodeClass(event.httpStatus))}>
                {(event.method ?? "ERR").toUpperCase()} {event.httpStatus ?? "---"}
              </span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {event.path || `/${event.module}/${event.category}`} ·{" "}
              {formatAdminLogTimestamp(event.lastSeenAt)}
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="Close overview"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Error
              </p>
              <div className="space-y-1 font-mono text-[11px]">
                <MetaRow label="ID" value={event.id} />
                <MetaRow label="Fingerprint" value={event.fingerprint} />
                <MetaRow label="Severity" value={event.severity} />
                <MetaRow label="Status" value={event.status} />
                <MetaRow label="Module" value={`${event.module} / ${event.category}`} />
                <MetaRow label="Source" value={event.source} />
                <MetaRow label="Environment" value={event.environment} />
                <MetaRow
                  label="Occurrences"
                  value={`${event.occurrences} (retries ${event.retryCount})`}
                />
                <MetaRow
                  label="Duration"
                  value={event.durationMs != null ? `${event.durationMs} ms` : ""}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Business
              </p>
              {snapshot ? (
                <div className="space-y-1 font-mono text-[11px]">
                  <MetaRow label="Name" value={snapshot.name} />
                  <MetaRow label="Owner" value={snapshot.ownerName || ""} />
                  <MetaRow label="Email" value={snapshot.ownerEmail || ""} />
                  <MetaRow label="Phone" value={snapshot.phone || ""} />
                  <MetaRow label="Plan" value={snapshot.plan || ""} />
                  <MetaRow label="Status" value={snapshot.status || ""} />
                  <MetaRow label="Contacts" value={String(snapshot.contactsCount)} />
                  <MetaRow
                    label="Conversations"
                    value={String(snapshot.conversationsCount)}
                  />
                  <MetaRow
                    label="Open errors"
                    value={String(snapshot.openErrorsCount)}
                  />
                  <MetaRow label="Business ID" value={snapshot.id} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {event.businessName || event.businessId || "No business linked"}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 space-y-2">
            {event.message ? (
              <div>
                <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Message
                </p>
                <p className="text-sm leading-6">{event.message}</p>
              </div>
            ) : null}
            {event.description ? (
              <div>
                <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Description
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {event.description}
                </p>
              </div>
            ) : null}
            {event.rootCause ? (
              <div>
                <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Root cause
                </p>
                <p className="text-sm leading-6">{event.rootCause}</p>
              </div>
            ) : null}
            {event.suggestedFix ? (
              <div>
                <p className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Suggested fix
                </p>
                <p className="text-sm leading-6">{event.suggestedFix}</p>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Code / stack
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => copyText("Code", codeBlock)}
              >
                <CopyIcon className="size-3" />
                Copy
              </button>
            </div>
            <pre className="max-h-[280px] overflow-auto rounded-lg border bg-zinc-950 p-4 font-mono text-[11px] leading-5 whitespace-pre-wrap text-zinc-100">
              {codeBlock}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
          <div className="flex flex-wrap gap-3 text-[11px]">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onStatus("investigating")}
            >
              Investigate
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onStatus("resolved")}
            >
              Resolve
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onStatus("ignored")}
            >
              Ignore
            </button>
          </div>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
