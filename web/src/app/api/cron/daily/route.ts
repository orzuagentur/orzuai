import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import {
  requeueFailedJobs,
  requeueStuckJobs,
} from "@/lib/requeue-failed-jobs";
import {
  MAX_PUBLISH_DRIFT_MINUTES,
  SCHEDULE_GENERATION_LEAD_MINUTES,
  clampVideosPerDay,
  padScheduleTimes,
} from "@/lib/publish-schedule";

export const runtime = "nodejs";

function weekdayMon1(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function todayInTz(timezone: string): {
  dateStr: string;
  weekday: number;
  hhmm: string;
  minutesOfDay: number;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  // Intl can return "24" for midnight — treat as 00:00
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const minute = parts.minute || "00";
  const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const minutesOfDay = Number(hour) * 60 + Number(minute);

  const wdMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const weekday =
    wdMap[parts.weekday || ""] ||
    weekdayMon1(new Date(`${dateStr}T12:00:00Z`));
  return { dateStr, weekday, hhmm, minutesOfDay };
}

type DueSlot = {
  dateStr: string;
  matchedTime: string;
  slotUtc: Date;
  generationDueAt: Date;
};

/**
 * All schedule slots whose generation window is open now.
 * The publish slot itself stays in planned_publish_at; scheduled_for is only
 * when the worker should start generating/uploading the video.
 */
function dueScheduleSlots(
  activeTimes: string[],
  dateStr: string,
  timeZone: string,
  now = new Date(),
  leadMinutes = SCHEDULE_GENERATION_LEAD_MINUTES,
  maxDriftMinutes = MAX_PUBLISH_DRIFT_MINUTES,
): DueSlot[] {
  const due: DueSlot[] = [];
  const leadMs = leadMinutes * 60 * 1000;
  const maxDriftMs = maxDriftMinutes * 60 * 1000;
  for (const t of activeTimes) {
    const slotUtc = zonedSlotToUtc(dateStr, t, timeZone);
    const generationDueAt = new Date(slotUtc.getTime() - leadMs);
    const latestStartAt = new Date(slotUtc.getTime() + maxDriftMs);
    if (now >= generationDueAt && now <= latestStartAt) {
      due.push({ dateStr, matchedTime: t, slotUtc, generationDueAt });
    }
  }
  return due;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function weekdayForDateStr(dateStr: string): number {
  return weekdayMon1(new Date(`${dateStr}T12:00:00Z`));
}

/** Convert local calendar date + HH:MM in `timeZone` to a UTC Date. */
function zonedSlotToUtc(dateStr: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, p.value]),
    );
    const hour = parts.hour === "24" ? 0 : Number(parts.hour);
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
    );
    const desired = Date.UTC(y, mo - 1, d, h, mi);
    guess += desired - asUtc;
  }
  return new Date(guess);
}

function normalizeTimes(times: string[]): string[] {
  return times
    .map((t) => {
      const [h, m] = String(t).trim().split(":");
      if (h == null) return "";
      return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
    })
    .filter(Boolean);
}

function dayAllowed(
  schedule: {
    mode?: string;
    weekdays?: number[];
    custom_dates?: string[];
  },
  weekday: number,
  dateStr: string,
): boolean {
  if (schedule.mode === "daily") return true;
  if (schedule.mode === "weekdays") {
    const days = schedule.weekdays;
    // Prefer explicit weekdays[] from UI; fall back to Mon–Fri
    if (Array.isArray(days) && days.length > 0) {
      return days.includes(weekday);
    }
    return weekday >= 1 && weekday <= 5;
  }
  if (schedule.mode === "custom_days") {
    return (schedule.weekdays || []).includes(weekday);
  }
  if (schedule.mode === "dates") {
    return (schedule.custom_dates || []).includes(dateStr);
  }
  return true;
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) return true;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Every 15 minutes:
 * 0) Auto-repair: requeue failed jobs (+ stuck mid-pipeline jobs)
 * 1) INSERT queued video_jobs for due schedule slots (Schedule ON + trained + YT)
 * 2) Python worker renders + uploads
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  let created = 0;
  let skipped = 0;
  const reasons: string[] = [];

  const failedRepair = await requeueFailedJobs(sb);
  const stuckRepair = await requeueStuckJobs(sb);
  if (failedRepair.requeued) {
    console.log(
      `[RETRY] cron requeued ${failedRepair.requeued} failed job(s)`,
      failedRepair.ids,
    );
  }
  if (stuckRepair.requeued) {
    console.log(
      `[RETRY] cron requeued ${stuckRepair.requeued} stuck job(s)`,
      stuckRepair.ids,
    );
  }

  const { data: schedules } = await sb
    .from("publish_schedules")
    .select("*")
    .eq("enabled", true);

  for (const schedule of schedules || []) {
    const { data: profile } = await sb
      .from("profiles")
      .select("id, youtube_connected, youtube_refresh_token")
      .eq("id", schedule.user_id)
      .maybeSingle();

    if (!profile?.youtube_connected) {
      skipped += 1;
      reasons.push(`${schedule.user_id}: youtube not connected`);
      continue;
    }

    let trainingOk = false;
    if (schedule.youtube_channel_id) {
      const { data: chTrain } = await sb
        .from("ai_training")
        .select("is_trained")
        .eq("user_id", schedule.user_id)
        .eq("youtube_channel_id", schedule.youtube_channel_id)
        .eq("is_trained", true)
        .limit(1)
        .maybeSingle();
      trainingOk = Boolean(chTrain?.is_trained);
    }
    if (!trainingOk) {
      const { data: anyTrain } = await sb
        .from("ai_training")
        .select("is_trained")
        .eq("user_id", schedule.user_id)
        .eq("is_trained", true)
        .limit(1)
        .maybeSingle();
      trainingOk = Boolean(anyTrain?.is_trained);
    }
    if (!trainingOk) {
      skipped += 1;
      reasons.push(`${schedule.user_id}: AI Training not completed`);
      continue;
    }

    const tz = schedule.timezone || "UTC";
    let today: string;
    try {
      const nowTz = todayInTz(tz);
      today = nowTz.dateStr;
    } catch {
      skipped += 1;
      reasons.push(`${schedule.user_id}: invalid timezone ${tz}`);
      continue;
    }

    const times = normalizeTimes(schedule.times || []);
    const perDay = clampVideosPerDay(schedule.videos_per_day || 1);
    const activeTimes = padScheduleTimes(perDay, times);
    const candidates = [
      addDaysToDateStr(today, -1),
      today,
      addDaysToDateStr(today, 1),
    ];
    const dueTimes = candidates.flatMap((dateStr) => {
      const weekday = weekdayForDateStr(dateStr);
      if (!dayAllowed(schedule, weekday, dateStr)) return [];
      return dueScheduleSlots(activeTimes, dateStr, tz);
    });

    if (!dueTimes.length) {
      skipped += 1;
      continue;
    }

    for (const due of dueTimes) {
      const slotKey = `${due.dateStr}T${due.matchedTime}`;
      let existingQuery = sb
        .from("video_jobs")
        .select("id")
        .eq("user_id", schedule.user_id)
        .contains("metadata", { schedule_slot: slotKey })
        .limit(1);
      existingQuery = schedule.youtube_channel_id
        ? existingQuery.eq("youtube_channel_id", schedule.youtube_channel_id)
        : existingQuery.is("youtube_channel_id", null);
      const { data: existing } = await existingQuery;
      if (existing && existing.length) {
        skipped += 1;
        continue;
      }

      const { error } = await sb.from("video_jobs").insert({
        user_id: schedule.user_id,
        youtube_channel_id: schedule.youtube_channel_id || null,
        status: "queued",
        scheduled_for: new Date().toISOString(),
        planned_publish_at: due.slotUtc.toISOString(),
        metadata: {
          schedule_slot: slotKey,
          schedule_time: due.matchedTime,
          schedule_timezone: tz,
          schedule_slot_utc: due.slotUtc.toISOString(),
          planned_publish_at: due.slotUtc.toISOString(),
          generation_due_at: due.generationDueAt.toISOString(),
          generation_lead_minutes: SCHEDULE_GENERATION_LEAD_MINUTES,
          max_publish_drift_minutes: MAX_PUBLISH_DRIFT_MINUTES,
          videos_per_day: perDay,
          youtube_channel_id: schedule.youtube_channel_id || null,
          source: "schedule",
          pipeline: "youtube",
          publish: true,
          publish_strategy: "youtube_scheduled_private",
        },
      });
      if (!error) created += 1;
      else reasons.push(`${schedule.user_id}: insert failed ${error.message}`);
    }
  }

  const { data: legacy } = await sb
    .from("profiles")
    .select("id, videos_per_day")
    .eq("daily_videos_enabled", true)
    .eq("youtube_connected", true);

  for (const user of legacy || []) {
    const { data: sched } = await sb
      .from("publish_schedules")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (sched) continue;

    const { data: training } = await sb
      .from("ai_training")
      .select("is_trained")
      .eq("user_id", user.id)
      .eq("is_trained", true)
      .limit(1)
      .maybeSingle();
    if (!training) continue;

    const count = clampVideosPerDay(user.videos_per_day || 2);
    const dayKey = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < count; i++) {
      const slotKey = `legacy-${dayKey}-${i}`;
      const { data: existing } = await sb
        .from("video_jobs")
        .select("id")
        .eq("user_id", user.id)
        .contains("metadata", { schedule_slot: slotKey })
        .limit(1);
      if (existing && existing.length) {
        skipped += 1;
        continue;
      }
      const plannedPublishAt = new Date(
        Date.now() + i * SCHEDULE_GENERATION_LEAD_MINUTES * 60 * 1000,
      ).toISOString();
      const { error } = await sb.from("video_jobs").insert({
        user_id: user.id,
        status: "queued",
        scheduled_for: new Date().toISOString(),
        planned_publish_at: plannedPublishAt,
        metadata: {
          schedule_slot: slotKey,
          planned_publish_at: plannedPublishAt,
          generation_lead_minutes: SCHEDULE_GENERATION_LEAD_MINUTES,
          max_publish_drift_minutes: MAX_PUBLISH_DRIFT_MINUTES,
          source: "schedule_legacy",
          pipeline: "youtube",
          publish: true,
          publish_strategy: "youtube_scheduled_private",
        },
      });
      if (!error) created += 1;
      else reasons.push(`${user.id}: legacy insert failed ${error.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    repaired_failed: failedRepair.requeued,
    repaired_stuck: stuckRepair.requeued,
    reasons: reasons.slice(0, 20),
  });
}
