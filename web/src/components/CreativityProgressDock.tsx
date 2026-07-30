"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isCreativityJob } from "@/lib/creativity-jobs";
import type { VideoJob } from "@/lib/types";
import {
  JOB_STATUS_LABEL,
  QUEUE_STATUSES,
  jobProgressPercent,
  statusColor,
} from "@/lib/job-status";

function creativityStatusLabel(
  status: string,
  tStatus: ReturnType<typeof useTranslations<"studio.status">>,
): string {
  switch (status) {
    case "queued":
    case "generating_script":
    case "generating_voice":
    case "fetching_media":
    case "editing":
    case "uploading":
    case "ready":
    case "scheduled":
    case "published":
    case "failed":
      return tStatus(status);
    default:
      return JOB_STATUS_LABEL[status] || status;
  }
}

function CircularProgressRing({
  percent,
  size = 56,
  busy,
}: {
  percent: number;
  size?: number;
  busy: boolean;
}) {
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(17,24,39,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={busy ? "var(--accent)" : "var(--success)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

/**
 * Global round progress indicator for AI Video (Creativity) jobs — polls while user navigates away.
 * Rendering runs server-side; this UI only reflects job status from the database.
 */
export function CreativityProgressDock() {
  const t = useTranslations("studio.creativity");
  const ts = useTranslations("studio.common");
  const tStatus = useTranslations("studio.status");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("video_jobs")
      .select(
        "id,status,title,error_message,created_at,completed_at,preview_url,duration_seconds,metadata,youtube_video_id",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data) setJobs((data as VideoJob[]).filter(isCreativityJob));
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refresh();
    });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const active = useMemo(
    () =>
      jobs.filter(
        (j) => QUEUE_STATUSES.has(j.status) && !dismissed.has(j.id),
      ),
    [jobs, dismissed],
  );

  const recentDone = useMemo(() => {
    const cutoff = Date.now() - 60_000;
    return jobs.filter((j) => {
      if (dismissed.has(j.id)) return false;
      if (j.status !== "ready" && j.status !== "failed") return false;
      const tsMs = new Date(j.completed_at || j.created_at).getTime();
      return Number.isFinite(tsMs) && tsMs >= cutoff;
    });
  }, [jobs, dismissed]);

  const visible = active.length > 0 ? active : recentDone.slice(0, 1);
  if (visible.length === 0) return null;

  const primary = visible[0];
  const pct = jobProgressPercent(primary.status);
  const busy = QUEUE_STATUSES.has(primary.status);
  const extra = active.length > 1 ? active.length - 1 : 0;

  return (
    <div
      className="fixed z-[84] flex flex-col items-end gap-2 right-3 max-lg:bottom-[calc(10.5rem+env(safe-area-inset-bottom))] lg:right-6 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto"
      role="status"
      aria-live="polite"
    >
      {open && (
        <div className="w-[min(100vw-1.5rem,280px)] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/98 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)] px-3 py-2">
            <Link
              href="/dashboard/content"
              className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)] hover:text-[color:var(--fg)]"
            >
              {t("title")}
            </Link>
            {!busy && (
              <button
                type="button"
                className="text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                aria-label={ts("dismiss")}
                onClick={() =>
                  setDismissed((prev) => {
                    const next = new Set(prev);
                    visible.forEach((j) => next.add(j.id));
                    return next;
                  })
                }
              >
                ×
              </button>
            )}
          </div>
          <ul className="max-h-52 space-y-2 overflow-y-auto p-3">
            {visible.map((job) => {
              const p = jobProgressPercent(job.status);
              const jobBusy = QUEUE_STATUSES.has(job.status);
              return (
                <li key={job.id}>
                  <Link
                    href="/dashboard/content?tab=library"
                    className="block rounded-xl px-1 py-0.5 transition hover:bg-black/[0.04]"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {job.title?.trim() || t("generatingTitle")}
                      </p>
                      <span
                        className="shrink-0 text-[11px] font-semibold tabular-nums"
                        style={{ color: statusColor(job.status) }}
                      >
                        {jobBusy ? `${p}%` : creativityStatusLabel(job.status, tStatus)}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 text-[11px]"
                      style={{ color: statusColor(job.status) }}
                    >
                      {creativityStatusLabel(job.status, tStatus)}
                      {job.status === "failed" && job.error_message
                        ? ` — ${job.error_message.slice(0, 80)}`
                        : ""}
                    </p>
                    {jobBusy && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${p}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/95 shadow-[0_12px_40px_rgba(17,24,39,0.18)] backdrop-blur-md transition active:scale-[0.97]"
        aria-expanded={open}
        aria-label={
          busy
            ? `${t("generatingTitle")} ${pct}%`
            : creativityStatusLabel(primary.status, tStatus)
        }
        onClick={() => setOpen((v) => !v)}
      >
        <span className="absolute inset-0 flex items-center justify-center">
          <CircularProgressRing percent={pct} size={56} busy={busy} />
        </span>
        <span
          className="relative z-[1] text-[11px] font-bold tabular-nums"
          style={{ color: busy ? "var(--accent)" : statusColor(primary.status) }}
        >
          {busy ? `${pct}` : primary.status === "ready" ? "✓" : "!"}
        </span>
        {extra > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[10px] font-bold text-[color:var(--btn-on-accent)]">
            +{extra}
          </span>
        )}
      </button>
    </div>
  );
}
