import { NextResponse } from "next/server";
import {
  createServiceClient,
  isAdminAuthenticated,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_VIDEOS_PER_DAY = 4;
const MIN_PUBLISH_GAP_MINUTES = 6 * 60;

const DEFAULT_TIMES_BY_COUNT: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "17:00"],
  3: ["09:00", "15:00", "21:00"],
  4: ["03:00", "09:00", "15:00", "21:00"],
};

type DbProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  youtube_connected: boolean | null;
  youtube_channel_id: string | null;
  youtube_channel_title: string | null;
  daily_videos_enabled: boolean | null;
  videos_per_day: number | null;
  created_at: string | null;
};

type DbChannel = {
  user_id: string;
  channel_id: string;
  title: string | null;
  custom_url: string | null;
  thumbnail_url: string | null;
  is_active: boolean | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
  stats_synced_at: string | null;
  updated_at: string | null;
};

type DbSchedule = {
  id: string;
  user_id: string;
  youtube_channel_id: string | null;
  enabled: boolean | null;
  mode: string | null;
  videos_per_day: number | null;
  times: string[] | null;
  weekdays: number[] | null;
  custom_dates: string[] | null;
  timezone: string | null;
  updated_at: string | null;
};

type DbTraining = {
  user_id: string;
  youtube_channel_id: string | null;
  is_trained: boolean | null;
  niche: string | null;
  language: string | null;
  video_format: string | null;
  duration_seconds: number | null;
  subtitle_style: string | null;
  visual_effect: string | null;
  montage_pace: string | null;
  updated_at: string | null;
};

type DbJob = {
  id: string;
  user_id: string;
  status: string;
  title: string | null;
  youtube_channel_id: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  error_message: string | null;
  scheduled_for: string | null;
  planned_publish_at: string | null;
  youtube_publish_at: string | null;
  actual_publish_at: string | null;
  publish_strategy: string | null;
  publish_drift_seconds: number | null;
  created_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
};

type YoutubeAdminRow = {
  key: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  channelId: string | null;
  channelTitle: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  connected: boolean;
  active: boolean;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  statsSyncedAt: string | null;
  trainingReady: boolean;
  trainingNiche: string | null;
  trainingLanguage: string | null;
  videoFormat: string | null;
  subtitleStyle: string | null;
  visualEffect: string | null;
  montagePace: string | null;
  scheduleId: string | null;
  scheduleEnabled: boolean;
  scheduleMode: string;
  videosPerDay: number;
  times: string[];
  timezone: string;
  latestJob: DbJob | null;
  jobCount: number;
  queuedCount: number;
  failedCount: number;
};

function keyOf(userId: string, channelId: string | null | undefined) {
  return `${userId}:${channelId || ""}`;
}

function clampVideosPerDay(value: unknown): number {
  return Math.min(
    MAX_VIDEOS_PER_DAY,
    Math.max(1, Math.round(Number(value) || 2)),
  );
}

function normalizeTime(value: unknown): string {
  const [rawH = "", rawM = "00"] = String(value || "").trim().split(":");
  const h = Math.min(23, Math.max(0, Number(rawH) || 0));
  const m = Math.min(59, Math.max(0, Number(rawM) || 0));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function defaultTimesForCount(count: number): string[] {
  return [...DEFAULT_TIMES_BY_COUNT[clampVideosPerDay(count)]];
}

function parseTimes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map(normalizeTime);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map(normalizeTime);
  }
  return [];
}

function padScheduleTimes(count: number, existing: unknown): string[] {
  const n = clampVideosPerDay(count);
  const out = parseTimes(existing).slice(0, n);
  for (const fallback of defaultTimesForCount(n)) {
    if (out.length >= n) break;
    if (!out.includes(fallback)) out.push(fallback);
  }
  return out.slice(0, n);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = normalizeTime(hhmm).split(":");
  return Number(h) * 60 + Number(m || 0);
}

function validateTimes(times: string[]): string | null {
  if (new Set(times).size !== times.length) {
    return "Each video needs a different publish time.";
  }
  const sorted = times.map(timeToMinutes).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] < MIN_PUBLISH_GAP_MINUTES) {
      return "Keep at least 6 hours between YouTube publish times.";
    }
  }
  return null;
}

function isYoutubeJob(job: DbJob): boolean {
  const meta = job.metadata || {};
  const pipeline = String(meta.pipeline || "").toLowerCase();
  const source = String(meta.source || "").toLowerCase();
  return Boolean(
    job.youtube_channel_id ||
      job.youtube_video_id ||
      job.youtube_url ||
      pipeline === "youtube" ||
      source.includes("youtube") ||
      source.includes("schedule"),
  );
}

async function hasReadyTraining(
  sb: ReturnType<typeof createServiceClient>,
  userId: string,
  channelId: string | null,
): Promise<boolean> {
  let query = sb
    .from("ai_training")
    .select("id")
    .eq("user_id", userId)
    .eq("is_trained", true);
  if (channelId) query = query.eq("youtube_channel_id", channelId);
  const { data } = await query.limit(1);
  if (data?.length) return true;
  if (!channelId) return false;
  const { data: fallback } = await sb
    .from("ai_training")
    .select("id")
    .eq("user_id", userId)
    .eq("is_trained", true)
    .limit(1);
  return Boolean(fallback?.length);
}

async function hasYoutubeConnection(
  sb: ReturnType<typeof createServiceClient>,
  userId: string,
  channelId: string | null,
): Promise<boolean> {
  const { data: profile } = await sb
    .from("profiles")
    .select("youtube_connected")
    .eq("id", userId)
    .maybeSingle();

  if (!channelId) return Boolean(profile?.youtube_connected);

  const { data: channel } = await sb
    .from("youtube_channels")
    .select("channel_id,refresh_token")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .maybeSingle();

  return Boolean(profile?.youtube_connected || channel?.refresh_token);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  const [profilesRes, channelsRes, schedulesRes, trainingRes, jobsRes] =
    await Promise.all([
      sb
        .from("profiles")
        .select(
          "id,email,display_name,youtube_connected,youtube_channel_id,youtube_channel_title,daily_videos_enabled,videos_per_day,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      sb
        .from("youtube_channels")
        .select(
          "user_id,channel_id,title,custom_url,thumbnail_url,is_active,subscriber_count,view_count,video_count,stats_synced_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(500),
      sb.from("publish_schedules").select("*").limit(500),
      sb
        .from("ai_training")
        .select(
          "user_id,youtube_channel_id,is_trained,niche,language,video_format,duration_seconds,subtitle_style,visual_effect,montage_pace,updated_at",
        )
        .limit(500),
      sb
        .from("video_jobs")
        .select(
          "id,user_id,status,title,youtube_channel_id,youtube_video_id,youtube_url,error_message,scheduled_for,planned_publish_at,youtube_publish_at,actual_publish_at,publish_strategy,publish_drift_seconds,created_at,completed_at,metadata",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const firstError =
    profilesRes.error ||
    channelsRes.error ||
    schedulesRes.error ||
    trainingRes.error ||
    jobsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const profiles = (profilesRes.data || []) as DbProfile[];
  const channels = (channelsRes.data || []) as DbChannel[];
  const schedules = (schedulesRes.data || []) as DbSchedule[];
  const trainings = (trainingRes.data || []) as DbTraining[];
  const youtubeJobs = ((jobsRes.data || []) as DbJob[]).filter(isYoutubeJob);
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const rows = new Map<string, YoutubeAdminRow>();

  const ensureRow = (
    userId: string,
    channelId: string | null,
  ): YoutubeAdminRow => {
    const key = keyOf(userId, channelId);
    const existing = rows.get(key);
    if (existing) return existing;

    const profile = profilesById.get(userId);
    const row: YoutubeAdminRow = {
      key,
      userId,
      email: profile?.email || null,
      displayName: profile?.display_name || null,
      channelId,
      channelTitle:
        profile?.youtube_channel_title ||
        (channelId ? `YouTube ${channelId.slice(0, 8)}` : "Legacy YouTube"),
      customUrl: null,
      thumbnailUrl: null,
      connected: Boolean(profile?.youtube_connected),
      active: Boolean(
        channelId && profile?.youtube_channel_id === channelId,
      ),
      subscriberCount: 0,
      videoCount: 0,
      viewCount: 0,
      statsSyncedAt: null,
      trainingReady: false,
      trainingNiche: null,
      trainingLanguage: null,
      videoFormat: null,
      subtitleStyle: null,
      visualEffect: null,
      montagePace: null,
      scheduleId: null,
      scheduleEnabled: false,
      scheduleMode: "daily",
      videosPerDay: clampVideosPerDay(profile?.videos_per_day || 2),
      times: defaultTimesForCount(clampVideosPerDay(profile?.videos_per_day || 2)),
      timezone: "Europe/Berlin",
      latestJob: null,
      jobCount: 0,
      queuedCount: 0,
      failedCount: 0,
    };
    rows.set(key, row);
    return row;
  };

  profiles.forEach((profile) => {
    if (profile.youtube_connected || profile.daily_videos_enabled) {
      ensureRow(profile.id, profile.youtube_channel_id || null);
    }
  });

  channels.forEach((channel) => {
    const row = ensureRow(channel.user_id, channel.channel_id);
    row.channelTitle = channel.title || row.channelTitle;
    row.customUrl = channel.custom_url;
    row.thumbnailUrl = channel.thumbnail_url;
    row.connected = true;
    row.active = Boolean(channel.is_active);
    row.subscriberCount = Number(channel.subscriber_count || 0);
    row.videoCount = Number(channel.video_count || 0);
    row.viewCount = Number(channel.view_count || 0);
    row.statsSyncedAt = channel.stats_synced_at;
  });

  const trainingByUser = new Map<string, DbTraining>();
  trainings.forEach((training) => {
    if (!training.is_trained) return;
    if (!trainingByUser.has(training.user_id)) {
      trainingByUser.set(training.user_id, training);
    }
  });

  trainings.forEach((training) => {
    const row = ensureRow(training.user_id, training.youtube_channel_id || null);
    const fallback = trainingByUser.get(training.user_id);
    const effective = training.is_trained ? training : fallback;
    row.trainingReady = Boolean(effective?.is_trained);
    row.trainingNiche = effective?.niche || null;
    row.trainingLanguage = effective?.language || null;
    row.videoFormat = effective?.video_format || null;
    row.subtitleStyle = effective?.subtitle_style || null;
    row.visualEffect = effective?.visual_effect || null;
    row.montagePace = effective?.montage_pace || null;
  });

  schedules.forEach((schedule) => {
    const row = ensureRow(schedule.user_id, schedule.youtube_channel_id || null);
    row.scheduleId = schedule.id;
    row.scheduleEnabled = Boolean(schedule.enabled);
    row.scheduleMode = schedule.mode || "daily";
    row.videosPerDay = clampVideosPerDay(schedule.videos_per_day || 2);
    row.times = padScheduleTimes(row.videosPerDay, schedule.times || []);
    row.timezone = schedule.timezone || "Europe/Berlin";
  });

  rows.forEach((row) => {
    if (row.trainingReady) return;
    const fallback = trainingByUser.get(row.userId);
    row.trainingReady = Boolean(fallback?.is_trained);
    row.trainingNiche = fallback?.niche || row.trainingNiche;
    row.trainingLanguage = fallback?.language || row.trainingLanguage;
    row.videoFormat = fallback?.video_format || row.videoFormat;
    row.subtitleStyle = fallback?.subtitle_style || row.subtitleStyle;
    row.visualEffect = fallback?.visual_effect || row.visualEffect;
    row.montagePace = fallback?.montage_pace || row.montagePace;
  });

  youtubeJobs.forEach((job) => {
    const row = ensureRow(job.user_id, job.youtube_channel_id || null);
    row.latestJob ||= job;
    row.jobCount += 1;
    if (
      [
        "queued",
        "generating_script",
        "generating_voice",
        "fetching_media",
        "editing",
        "uploading",
        "scheduled",
      ].includes(job.status)
    ) {
      row.queuedCount += 1;
    }
    if (job.status === "failed") row.failedCount += 1;
  });

  const items = Array.from(rows.values())
    .filter(
      (row) =>
        row.connected ||
        row.scheduleId ||
        row.trainingReady ||
        row.jobCount > 0,
    )
    .sort((a, b) => {
      if (a.scheduleEnabled !== b.scheduleEnabled) {
        return a.scheduleEnabled ? -1 : 1;
      }
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.channelTitle.localeCompare(b.channelTitle);
    });

  return NextResponse.json({
    items,
    totals: {
      channels: items.length,
      schedulesOn: items.filter((item) => item.scheduleEnabled).length,
      trained: items.filter((item) => item.trainingReady).length,
      queued: items.reduce((sum, item) => sum + item.queuedCount, 0),
      failed: items.reduce((sum, item) => sum + item.failedCount, 0),
    },
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    channelId?: string | null;
    enabled?: boolean;
    mode?: string;
    videosPerDay?: number;
    times?: string[] | string;
    timezone?: string;
  } | null;

  const userId = String(body?.userId || "").trim();
  const channelId = body?.channelId ? String(body.channelId).trim() : null;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const sb = createServiceClient();
  const enabled = body?.enabled !== false;
  if (enabled) {
    if (!(await hasYoutubeConnection(sb, userId, channelId))) {
      return NextResponse.json(
        { error: "YouTube is not connected for this channel." },
        { status: 400 },
      );
    }
    if (!(await hasReadyTraining(sb, userId, channelId))) {
      return NextResponse.json(
        { error: "AI training must be completed before autopublish is enabled." },
        { status: 400 },
      );
    }
  }

  let existingQuery = sb
    .from("publish_schedules")
    .select("*")
    .eq("user_id", userId);
  existingQuery = channelId
    ? existingQuery.eq("youtube_channel_id", channelId)
    : existingQuery.is("youtube_channel_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const mode = String(body?.mode || existing?.mode || "daily");
  if (!["daily", "weekdays", "custom_days", "dates"].includes(mode)) {
    return NextResponse.json({ error: "Invalid schedule mode" }, { status: 400 });
  }

  const videosPerDay = clampVideosPerDay(
    body?.videosPerDay ?? existing?.videos_per_day ?? 2,
  );
  const times = padScheduleTimes(
    videosPerDay,
    body?.times ?? existing?.times ?? defaultTimesForCount(videosPerDay),
  );
  const timeError = validateTimes(times);
  if (timeError) {
    return NextResponse.json({ error: timeError }, { status: 400 });
  }

  const payload = {
    user_id: userId,
    youtube_channel_id: channelId,
    enabled,
    mode,
    videos_per_day: videosPerDay,
    times,
    weekdays: existing?.weekdays || [1, 2, 3, 4, 5, 6, 7],
    custom_dates: existing?.custom_dates || [],
    timezone: String(body?.timezone || existing?.timezone || "Europe/Berlin"),
  };

  const write = existing?.id
    ? sb.from("publish_schedules").update(payload).eq("id", existing.id)
    : sb.from("publish_schedules").insert(payload);
  const { error } = await write;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: enabledSchedules } = await sb
    .from("publish_schedules")
    .select("videos_per_day")
    .eq("user_id", userId)
    .eq("enabled", true);
  const enabledRows = enabledSchedules || [];
  const profileVideos = enabledRows.length
    ? Math.max(...enabledRows.map((row) => clampVideosPerDay(row.videos_per_day)))
    : videosPerDay;
  await sb
    .from("profiles")
    .update({
      daily_videos_enabled: enabledRows.length > 0,
      videos_per_day: profileVideos,
    })
    .eq("id", userId);

  return NextResponse.json({ ok: true, schedule: payload });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    userId?: string;
    channelId?: string | null;
  } | null;

  const userId = String(body?.userId || "").trim();
  const channelId = body?.channelId ? String(body.channelId).trim() : null;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (body?.action && body.action !== "queue_now") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const sb = createServiceClient();
  if (!(await hasYoutubeConnection(sb, userId, channelId))) {
    return NextResponse.json(
      { error: "YouTube is not connected for this channel." },
      { status: 400 },
    );
  }
  if (!(await hasReadyTraining(sb, userId, channelId))) {
    return NextResponse.json(
      { error: "AI training must be completed before queuing YouTube publish." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const metadata: Record<string, unknown> = {
    publish: true,
    source: "admin_youtube_autopublish",
    pipeline: "youtube",
    mode: "ai_auto",
    manual_publish: true,
    publish_request: "immediate_public",
    youtube_channel_id: channelId,
    admin_created: true,
    used_ai_training: true,
  };

  const { data, error } = await sb
    .from("video_jobs")
    .insert({
      user_id: userId,
      youtube_channel_id: channelId,
      status: "queued",
      scheduled_for: now,
      planned_publish_at: null,
      metadata,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobId: data.id });
}
