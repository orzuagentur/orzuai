"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, VideoJob } from "@/lib/types";
import { YouTubeVideoCards } from "@/components/YouTubeVideoCards";
import { YouTubeChannelsButton } from "@/components/AppShell";
import { CardMenu, CardMenuSlot } from "@/components/CardMenu";
import {
  JOB_STATUS_LABEL,
  QUEUE_STATUSES,
  jobProgressPercent,
} from "@/lib/job-status";
import { useToast } from "@/components/ToastNotice";

type PubStep = "closed" | "root" | "ai" | "device" | "prompt" | "drafts";

function isYoutubeQueueJob(job: VideoJob) {
  const src = String(job.metadata?.source || "");
  const pipeline = String(job.metadata?.pipeline || "");
  if (src === "creativity" || pipeline === "creativity") return false;
  return QUEUE_STATUSES.has(job.status);
}

export function ChannelStudio({
  profile,
  videos,
  drafts: draftsInitial = [],
  initialQueue = [],
  isTrained = false,
  aiContentEnabled = false,
  youtubeUnauthorized = false,
  needsAutoSync = false,
}: {
  profile: Profile | null;
  videos: VideoJob[];
  drafts?: VideoJob[];
  initialQueue?: VideoJob[];
  isTrained?: boolean;
  aiContentEnabled?: boolean;
  youtubeUnauthorized?: boolean;
  /** True when DB cache is older than 24h — one quiet YouTube sync on mount. */
  needsAutoSync?: boolean;
}) {
  const t = useTranslations("studio.channel");
  const tc = useTranslations("studio.common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { show: toast, notice } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    profile?.youtube_banner_url || null,
  );
  const [step, setStep] = useState<PubStep>("closed");
  const [prompt, setPrompt] = useState("");
  const [deviceTitle, setDeviceTitle] = useState("");
  const [queue, setQueue] = useState<VideoJob[]>(initialQueue);
  const [drafts, setDrafts] = useState<VideoJob[]>(draftsInitial);
  const [aiOn, setAiOn] = useState(aiContentEnabled);
  /** Keep polling these job ids even if a refresh briefly returns empty. */
  const watchingRef = useRef<Set<string>>(new Set());
  const [watchTick, setWatchTick] = useState(0);
  const [unauthorized, setUnauthorized] = useState(youtubeUnauthorized);
  const [channelStats, setChannelStats] = useState(() => ({
    subscribers: profile?.youtube_subscriber_count ?? 0,
    views: profile?.youtube_view_count ?? 0,
    videos: profile?.youtube_video_count ?? 0,
    likes:
      profile?.youtube_like_count ??
      videos.reduce((s, v) => s + Number(v.like_count || 0), 0),
    comments:
      profile?.youtube_comment_count ??
      videos.reduce((s, v) => s + Number(v.comment_count || 0), 0),
    title: profile?.youtube_channel_title || null,
    customUrl: profile?.youtube_custom_url || null,
    thumbnailUrl: profile?.youtube_thumbnail_url || null,
  }));
  const autoSyncDone = useRef(false);
  const pubMenuRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  function connectYoutube() {
    window.location.assign("/api/youtube/connect");
  }

  useEffect(() => {
    // Merge server queue with any jobs we are still watching (avoid wipe after router.refresh)
    setQueue((prev) => {
      const byId = new Map<string, VideoJob>();
      for (const j of initialQueue) byId.set(j.id, j);
      for (const j of prev) {
        if (watchingRef.current.has(j.id) && QUEUE_STATUSES.has(j.status)) {
          const newer = byId.get(j.id);
          byId.set(j.id, newer || j);
        }
      }
      return Array.from(byId.values())
        .filter(isYoutubeQueueJob)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    });
  }, [initialQueue]);

  useEffect(() => {
    setDrafts(draftsInitial);
  }, [draftsInitial]);

  useEffect(() => {
    setUnauthorized(youtubeUnauthorized);
  }, [youtubeUnauthorized]);

  useEffect(() => {
    setChannelStats({
      subscribers: profile?.youtube_subscriber_count ?? 0,
      views: profile?.youtube_view_count ?? 0,
      videos: profile?.youtube_video_count ?? 0,
      likes:
        profile?.youtube_like_count ??
        videos.reduce((s, v) => s + Number(v.like_count || 0), 0),
      comments:
        profile?.youtube_comment_count ??
        videos.reduce((s, v) => s + Number(v.comment_count || 0), 0),
      title: profile?.youtube_channel_title || null,
      customUrl: profile?.youtube_custom_url || null,
      thumbnailUrl: profile?.youtube_thumbnail_url || null,
    });
    if (profile?.youtube_banner_url) {
      setBannerUrl(profile.youtube_banner_url);
    }
  }, [profile, videos]);

  useEffect(() => {
    if (step !== "root") return;
    function onDoc(e: MouseEvent) {
      if (!pubMenuRef.current?.contains(e.target as Node)) {
        setStep("closed");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [step]);

  useEffect(() => {
    if (!analyticsOpen) return;
    function onDoc(e: MouseEvent) {
      if (!analyticsRef.current?.contains(e.target as Node)) {
        setAnalyticsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [analyticsOpen]);

  useEffect(() => {
    setAiOn(aiContentEnabled);
  }, [aiContentEnabled]);

  const activeJobs = useMemo(
    () => queue.filter((j) => isYoutubeQueueJob(j)),
    [queue],
  );

  const refreshQueue = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let q = supabase
      .from("video_jobs")
      .select(
        "id,status,title,script_text,youtube_url,youtube_video_id,error_message,scheduled_for,created_at,completed_at,thumbnail_url,preview_url,duration_seconds,metadata",
      )
      .eq("user_id", user.id)
      .in("status", Array.from(QUEUE_STATUSES))
      .order("created_at", { ascending: false })
      .limit(20);
    if (profile?.youtube_channel_id) {
      q = q.eq("youtube_channel_id", profile.youtube_channel_id);
    }
    const { data, error } = await q;
    if (error || !data) return;

    const next = (data as VideoJob[]).filter(isYoutubeQueueJob);
    const nextIds = new Set(next.map((j) => j.id));
    const finishedIds = [...watchingRef.current].filter((id) => !nextIds.has(id));

    // Drop watchers that finished (left QUEUE_STATUSES)
    for (const id of finishedIds) {
      watchingRef.current.delete(id);
    }

    setQueue((prev) => {
      const byId = new Map<string, VideoJob>();
      for (const j of next) byId.set(j.id, j);
      // Keep optimistic stubs until they appear in the query
      for (const j of prev) {
        if (watchingRef.current.has(j.id) && !byId.has(j.id)) {
          byId.set(j.id, j);
        }
      }
      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    });
    setWatchTick((n) => n + 1);
    if (finishedIds.length > 0) {
      router.refresh();
    }
  }, [profile?.youtube_channel_id, router]);

  function trackJob(job: Partial<VideoJob> & { id: string }) {
    watchingRef.current.add(job.id);
    const stub: VideoJob = {
      id: job.id,
      status: job.status || "queued",
      title: job.title ?? null,
      script_text: job.script_text ?? null,
      youtube_url: null,
      youtube_video_id: null,
      error_message: null,
      scheduled_for: job.scheduled_for || new Date().toISOString(),
      created_at: job.created_at || new Date().toISOString(),
      completed_at: null,
      thumbnail_url: null,
      preview_url: null,
      metadata: {
        pipeline: "youtube",
        source: "youtube_ai",
        publish: true,
        ...(job.metadata || {}),
      },
    };
    setQueue((prev) => {
      if (prev.some((j) => j.id === stub.id)) return prev;
      return [stub, ...prev];
    });
    setWatchTick((n) => n + 1);
  }

  useEffect(() => {
    const watching = watchingRef.current.size > 0 || activeJobs.length > 0;
    if (!watching) return;
    const t = window.setInterval(() => {
      void refreshQueue();
    }, 2500);
    return () => window.clearInterval(t);
  }, [activeJobs.length, watchTick, refreshQueue]);

  async function toggleAiContent() {
    if (!aiOn && !isTrained) {
      router.push("/dashboard/channel/training?enableAi=1");
      return;
    }

    setBusy("ai_toggle");
    const next = !aiOn;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      if (data.error === "complete_training" && data.redirect) {
        router.push(String(data.redirect));
        return;
      }
      toast(data.message || data.error || t("failedToggleAi"), "error");
      return;
    }
    setAiOn(next);
    toast(next ? t("aiEnabled") : t("aiDisabled"));
    router.refresh();
  }

  const applySyncPayload = useCallback(
    (data: {
      bannerUrl?: string | null;
      channel?: {
        title?: string | null;
        customUrl?: string | null;
        thumbnailUrl?: string | null;
        subscriberCount?: number;
        viewCount?: number;
        videoCount?: number;
        likeCount?: number;
        commentCount?: number;
      };
    }) => {
      if (data.bannerUrl) setBannerUrl(String(data.bannerUrl));
      const ch = data.channel;
      if (ch) {
        setChannelStats({
          subscribers: Number(ch.subscriberCount ?? 0),
          views: Number(ch.viewCount ?? 0),
          videos: Number(ch.videoCount ?? 0),
          likes: Number(ch.likeCount ?? 0),
          comments: Number(ch.commentCount ?? 0),
          title: ch.title ?? null,
          customUrl: ch.customUrl ?? null,
          thumbnailUrl: ch.thumbnailUrl ?? null,
        });
      }
    },
    [],
  );

  const runSync = useCallback(
    async (force: boolean, quiet = false) => {
      setBusy("sync");
      try {
        const res = await fetch("/api/youtube/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = String(data.error || t("failedRefresh"));
          if (
            /token|unauthorized|expired|not connected|refresh failed|session/i.test(
              msg,
            ) ||
            res.status === 401
          ) {
            setUnauthorized(true);
          }
          if (!quiet) toast(msg, "error");
          return;
        }

        setUnauthorized(false);
        applySyncPayload(data);

        if (!data.cached) {
          await refreshQueue();
          router.refresh();
        }

        if (!quiet) {
          if (data.cached) {
            toast(t("cachedData"));
          } else {
            const imported = Number(data.imported || 0);
            const updated = Number(data.updated || 0);
            toast(
              imported > 0
                ? `Fetched ${imported} new videos from YouTube` +
                  (updated ? `, updated ${updated}.` : ".")
                : updated > 0
                  ? `Updated ${updated} videos.`
                  : t("channelUpdated"),
            );
          }
        } else if (!data.cached) {
          toast(t("statsRefreshed"), "info");
        }
      } finally {
        setBusy(null);
      }
    },
    [applySyncPayload, refreshQueue, router, t, toast],
  );

  // Auto-sync once per visit only when DB cache is older than 24h
  useEffect(() => {
    if (!needsAutoSync || !profile?.youtube_connected || autoSyncDone.current) {
      return;
    }
    autoSyncDone.current = true;
    void runSync(false, true);
  }, [needsAutoSync, profile?.youtube_connected, runSync]);

  async function sync() {
    await runSync(true, false);
  }

  async function disconnect() {
    if (!confirm(t("disconnectConfirm"))) return;
    setBusy("disconnect");
    const res = await fetch("/api/youtube/disconnect", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast(data.error || t("failedDisconnect"), "error");
      return;
    }
    toast(t("disconnected"));
    router.refresh();
  }

  async function removeVideo(youtubeVideoId: string) {
    if (!confirm(t("deleteYoutubeConfirm"))) return;
    setBusy(youtubeVideoId);
    const res = await fetch("/api/youtube/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeVideoId }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast(data.error || tc("failedToDelete"), "error");
      return;
    }
    toast(t("videoDeleted"));
    router.refresh();
  }

  async function publishDraft(jobId: string) {
    setBusy(jobId);
    const res = await fetch(`/api/jobs/${jobId}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast(data.error || "Publish failed", "error");
      return;
    }
    setDrafts((prev) => prev.filter((d) => d.id !== jobId));
    toast(t("draftQueued"));
    setStep("closed");
    trackJob({
      id: jobId,
      status: "queued",
      metadata: {
        source: "draft_publish",
        publish: true,
        manual_publish: true,
        publish_request: "immediate_public",
      },
    });
    void refreshQueue();
  }

  async function startAiAuto() {
    if (!isTrained) {
      toast(t("saveTrainingFirst"), "error");
      return;
    }
    setBusy("ai_auto");
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai_auto",
        source: "youtube_ai",
        pipeline: "youtube",
        publish: true,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast(data.error || tc("failedToStart"), "error");
      return;
    }
    setStep("closed");
    if (data.job_id) {
      trackJob({
        id: String(data.job_id),
        status: "queued",
        metadata: {
          source: "youtube_ai",
          pipeline: "youtube",
          publish: true,
          manual_publish: true,
          publish_request: "immediate_public",
        },
      });
    }
    toast(t("aiCreating"), "info");
    await refreshQueue();
  }

  async function startAiPrompt() {
    const text = prompt.trim();
    if (text.length < 8) {
      toast("Write a prompt in at least one sentence.", "error");
      return;
    }
    if (!isTrained) {
      toast(t("saveTrainingFirst"), "error");
      return;
    }
    setBusy("ai_prompt");
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai_prompt",
        source: "youtube_prompt",
        pipeline: "youtube",
        publish: true,
        brief: text,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast(data.error || tc("failedToStart"), "error");
      return;
    }
    setPrompt("");
    setStep("closed");
    if (data.job_id) {
      trackJob({
        id: String(data.job_id),
        status: "queued",
        metadata: {
          source: "youtube_prompt",
          pipeline: "youtube",
          publish: true,
          manual_publish: true,
          publish_request: "immediate_public",
        },
      });
    }
    toast(t("aiCreating"), "info");
    await refreshQueue();
  }

  async function startDeviceUpload(file: File) {
    setBusy("device");
    const fd = new FormData();
    fd.set("file", file);
    if (deviceTitle.trim()) fd.set("title", deviceTitle.trim());
    const res = await fetch("/api/jobs/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast(data.error || "Failed to upload", "error");
      return;
    }
    setDeviceTitle("");
    setStep("closed");
    if (data.job_id) {
      trackJob({
        id: String(data.job_id),
        status: "queued",
        metadata: {
          source: "device_upload",
          pipeline: "youtube",
          publish: true,
          manual_publish: true,
          publish_request: "immediate_public",
        },
      });
    }
    toast("Video uploaded - publishing to YouTube.", "info");
    await refreshQueue();
  }

  if (!profile?.youtube_connected) {
    return (
      <div className="panel rise relative space-y-4 p-6">
        {notice}
        <div className="absolute left-3 top-3 z-10">
          <YouTubeChannelsButton />
        </div>
        <h1 className="mt-12 text-xl font-semibold sm:mt-14 sm:text-2xl">
          {t("noChannel")}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          Connect your YouTube channel. Professional AI will study it and help
          you create Shorts, reply to comments, and publish every day.
        </p>
        <button
          type="button"
          onClick={connectYoutube}
          className="btn btn-primary inline-flex"
        >
          {t("connectYoutube")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-28">
      {notice}

      {/* Centered publication modals */}
      {step === "ai" && (
        <PubModal
          title={t("aiPublish")}
          subtitle={t("createFromTraining")}
          onClose={() => setStep("closed")}
        >
          <div className="grid gap-2">
            <button
              type="button"
              disabled={busy === "ai_auto"}
              className="rounded-xl border border-[color:var(--line)] px-3.5 py-3 text-left transition hover:border-[color:rgba(232,165,75,0.45)] disabled:opacity-50"
              onClick={() => void startAiAuto()}
            >
              <p className="text-sm font-semibold">{t("aiAuto")}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                Uses niche / style from AI Training and publishes right away
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--accent)" }}>
                {busy === "ai_auto" ? t("waiting") : "Create and publish"}
              </p>
            </button>
            <button
              type="button"
              className="rounded-xl border border-[color:var(--line)] px-3.5 py-3 text-left transition hover:border-[color:rgba(232,165,75,0.45)]"
              onClick={() => setStep("prompt")}
            >
              <p className="text-sm font-semibold">{t("prompt")}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                You write the idea — AI makes a video and publishes
              </p>
            </button>
          </div>
        </PubModal>
      )}

      {step === "prompt" && (
        <PubModal
          title={t("prompt")}
          subtitle="Describe the video — AI will create and publish it"
          onClose={() => setStep("closed")}
          onBack={() => setStep("ai")}
        >
          <textarea
            className="field min-h-[110px] w-full text-sm"
            placeholder={t("topicPlaceholder")}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy === "ai_prompt"}
            autoFocus
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary text-sm"
              disabled={busy === "ai_prompt" || prompt.trim().length < 8}
              onClick={() => void startAiPrompt()}
            >
              {busy === "ai_prompt" ? t("waiting") : "Create and publish"}
            </button>
          </div>
        </PubModal>
      )}

      {step === "device" && (
        <PubModal
          title={t("fromDevice")}
          subtitle={t("uploadMp4")}
          onClose={() => setStep("closed")}
        >
          <input
            className="field w-full text-sm"
            placeholder={t("titleOptional")}
            value={deviceTitle}
            onChange={(e) => setDeviceTitle(e.target.value)}
            disabled={busy === "device"}
          />
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void startDeviceUpload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn-primary mt-3 w-full text-sm"
            disabled={busy === "device"}
            onClick={() => fileRef.current?.click()}
          >
            {busy === "device" ? tc("uploading") : "Choose video from device"}
          </button>
        </PubModal>
      )}

      <section className="panel rise relative z-40">
        {/* Red YouTube Channels control — only on this card, top-left */}
        <div
          className="absolute left-2 top-2 z-50"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <YouTubeChannelsButton />
        </div>

        <CardMenuSlot>
          <div className="relative flex flex-col items-end gap-1.5">
            <div className="relative flex items-center gap-1.5">
              {/* Mobile-only: extra stats (views / likes / comments) */}
              <div className="relative sm:hidden" ref={analyticsRef}>
                <button
                  type="button"
                  title={t("analytics")}
                  aria-label={t("analytics")}
                  aria-expanded={analyticsOpen}
                  onClick={() => {
                    setStep("closed");
                    setAnalyticsOpen((v) => !v);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                  style={{
                    boxShadow: analyticsOpen
                      ? "0 0 0 2px rgba(232,165,75,0.55)"
                      : undefined,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 19V9" />
                    <path d="M10 19V5" />
                    <path d="M16 19v-7" />
                    <path d="M22 19V8" />
                  </svg>
                </button>
                {analyticsOpen && (
                  <div
                    className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-2 shadow-2xl"
                    role="dialog"
                    aria-label={t("analytics")}
                  >
                    <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                      {t("analytics")}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      <Stat
                        label={t("views")}
                        value={channelStats.views}
                        compact
                      />
                      <Stat
                        label={t("likes")}
                        value={channelStats.likes}
                        compact
                      />
                      <Stat
                        label={t("comments")}
                        value={channelStats.comments}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={pubMenuRef}>
                <button
                  type="button"
                  title={t("publications")}
                  aria-label={t("publications")}
                  aria-expanded={step === "root"}
                  onClick={() => {
                    setAnalyticsOpen(false);
                    setStep((s) => (s === "closed" || s === "drafts" ? "root" : "closed"));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                  style={{
                    boxShadow:
                      step === "root" || step === "ai" || step === "device" || step === "prompt"
                        ? "0 0 0 2px rgba(232,165,75,0.55)"
                        : undefined,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 3v12" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 21h14" />
                    <path d="M5 17h14" />
                  </svg>
                </button>

                {/* Compact chooser under the icon */}
                {step === "root" && (
                  <div
                    className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1.5 shadow-2xl"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
                      onClick={() => setStep("ai")}
                    >
                      <span className="text-sm font-semibold">{t("aiPublish")}</span>
                      <span className="text-[11px] text-[color:var(--muted)]">
                        Training niche or your prompt
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
                      onClick={() => setStep("device")}
                    >
                      <span className="text-sm font-semibold">{t("fromDevice")}</span>
                      <span className="text-[11px] text-[color:var(--muted)]">
                        Upload MP4 from phone or PC
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                title={
                  drafts.length
                    ? `${t("drafts")} (${drafts.length})`
                    : t("drafts")
                }
                aria-label={t("drafts")}
                aria-expanded={step === "drafts"}
                onClick={() => {
                  setAnalyticsOpen(false);
                  setStep((s) => (s === "drafts" ? "closed" : "drafts"));
                }}
                className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                style={{
                  boxShadow:
                    step === "drafts"
                      ? "0 0 0 2px rgba(232,165,75,0.55)"
                      : undefined,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h8" />
                  <path d="M8 17h6" />
                </svg>
                {drafts.length > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-black"
                    style={{ background: "var(--accent)" }}
                  >
                    {drafts.length > 9 ? "9+" : drafts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                title={tc("refresh")}
                aria-label={tc("refresh")}
                disabled={busy === "sync"}
                onClick={() => void sync()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={busy === "sync" ? "animate-spin" : undefined}
                >
                  <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
              <CardMenu
                items={[
                  { label: t("addChannel"), onClick: connectYoutube },
                  {
                    label:
                      busy === "disconnect" ? "Disconnecting..." : "Disconnect",
                    danger: true,
                    disabled: busy === "disconnect",
                    onClick: () => void disconnect(),
                  },
                ]}
              />
            </div>
            {unauthorized && (
              <button
                type="button"
                onClick={connectYoutube}
                className="inline-flex min-w-[9.5rem] items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                style={{ background: "#FF0000" }}
              >
                Авторизоваться
              </button>
            )}
          </div>
        </CardMenuSlot>

        <div className="relative h-20 w-full overflow-hidden rounded-t-[inherit] bg-gradient-to-br from-[#1a1a1a] via-[#2a1810] to-[#0d0d0d] sm:h-36">
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--bg-elevated)] via-transparent to-black/20" />
        </div>

        <div className="relative -mt-7 space-y-3 px-3 pb-3 sm:-mt-10 sm:space-y-4 sm:px-6 sm:pb-5">
          <div className="flex flex-wrap items-end gap-2.5 sm:gap-4">
            {channelStats.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channelStats.thumbnailUrl}
                alt=""
                className="h-14 w-14 rounded-full border-4 border-[color:var(--bg-elevated)] object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[color:var(--bg-elevated)] bg-black/40 text-sm sm:h-20 sm:w-20">
                YT
              </div>
            )}
            <div className="min-w-0 flex-1 pb-0.5 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold sm:text-xl">
                  {channelStats.title || "YouTube channel"}
                </h2>
                {unauthorized && (
                  <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                    Unauthorized
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[color:var(--muted)] sm:text-sm">
                {channelStats.customUrl || profile.youtube_channel_id}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2.5 sm:gap-3">
            {/* Mobile: only subscribers + videos */}
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 text-center sm:hidden">
              <Stat label={t("subscribers")} value={channelStats.subscribers} />
              <Stat label="Videos" value={channelStats.videos} />
            </div>
            {/* Desktop / tablet: full stats */}
            <div className="hidden min-w-0 flex-1 grid-cols-3 gap-2 text-center sm:grid sm:max-w-2xl sm:grid-cols-5 sm:gap-3">
              <Stat label={t("subscribers")} value={channelStats.subscribers} />
              <Stat label={t("views")} value={channelStats.views} />
              <Stat label="Videos" value={channelStats.videos} />
              <Stat label={t("likes")} value={channelStats.likes} />
              <Stat label={t("comments")} value={channelStats.comments} />
            </div>

            {/* AI Training + AI content toggle */}
            <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Link
                href="/dashboard/channel/training"
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/80 px-2.5 py-1.5 text-xs font-semibold transition hover:border-[color:rgba(232,165,75,0.45)] sm:px-3 sm:py-2 sm:text-sm"
              >
                AI Training
              </Link>
              <div className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/80 px-2 py-1.5 sm:gap-2.5 sm:px-2.5 sm:py-2">
                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-semibold leading-tight sm:text-[11px]">
                    AI content
                  </p>
                  <p className="text-[9px] text-[color:var(--muted)]">
                    {aiOn ? "On schedule" : "Off"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiOn}
                  disabled={busy === "ai_toggle"}
                  onClick={() => void toggleAiContent()}
                  className="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50"
                  style={{
                    background: aiOn
                      ? "rgba(232,165,75,0.95)"
                      : "rgba(255,255,255,0.12)",
                  }}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition"
                    style={{ left: aiOn ? "1.25rem" : "0.15rem" }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">{t("publishedVideos")}</h3>
        <YouTubeVideoCards
          jobs={videos}
          onDelete={removeVideo}
          busyId={busy}
          emptyLabel="No published videos yet."
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">
            {t("drafts")}
            {drafts.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-[color:var(--muted)]">
                ({drafts.length})
              </span>
            ) : null}
          </h3>
          <p className="text-[11px] text-[color:var(--muted)]">
            Ready videos not published to YouTube
          </p>
        </div>
        <YouTubeVideoCards
          jobs={drafts}
          onPublish={(id) => void publishDraft(id)}
          busyId={busy}
          emptyLabel="No drafts yet — create with AI publish off, Creativity, or Content."
        />
      </section>

      {step === "drafts" && (
        <PubModal
          title={t("drafts")}
          subtitle="Unpublished videos ready to send to YouTube"
          onClose={() => setStep("closed")}
        >
          <div className="max-h-[60vh] overflow-y-auto">
            <YouTubeVideoCards
              jobs={drafts}
              onPublish={(id) => void publishDraft(id)}
              busyId={busy}
              emptyLabel="No drafts yet."
            />
          </div>
        </PubModal>
      )}

      {activeJobs.length > 0 && (
        <div className="pointer-events-none fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-3 z-[80] flex w-[min(100%-1.5rem,300px)] flex-col gap-2 sm:right-4 lg:bottom-6 lg:right-6">
          {activeJobs.map((job) => {
            const pct = jobProgressPercent(job.status);
            return (
              <div
                key={job.id}
                className="pointer-events-auto rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/95 p-3 shadow-xl backdrop-blur-md"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{t("youtubeVideo")}</p>
                    <p className="truncate text-[10px] text-[color:var(--muted)]">
                      {JOB_STATUS_LABEL[job.status] || job.status}
                      {job.title ? ` · ${job.title}` : ""}
                    </p>
                  </div>
                  <span
                    className="font-[family-name:var(--font-syne)] text-base tabular-nums"
                    style={{ color: "var(--accent)", fontWeight: 700 }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      background:
                        "linear-gradient(90deg, var(--accent-dim), var(--accent))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PubModal({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pub-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label={tCommon("close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {onBack && (
              <button
                type="button"
                className="mb-1 text-[11px] text-[color:var(--muted)] transition hover:text-[color:var(--fg)]"
                onClick={onBack}
              >
                ← {tCommon("back")}
              </button>
            )}
            <h2
              id="pub-modal-title"
              className="font-[family-name:var(--font-syne)] text-base leading-tight"
              style={{ fontWeight: 700 }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-white/8 hover:text-[color:var(--fg)]"
            aria-label={tCommon("close")}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  const text =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : String(value);
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--line)] px-2.5 py-2">
        <p className="text-[11px] text-[color:var(--muted)]">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{text}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[color:var(--line)] px-1.5 py-2 sm:px-2 sm:py-3">
      <p className="text-base font-semibold tabular-nums sm:text-lg">{text}</p>
      <p className="truncate text-[10px] text-[color:var(--muted)] sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}
