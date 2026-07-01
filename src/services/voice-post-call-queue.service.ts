import "server-only";

import { claimVoicePostCallJobs } from "@/lib/queue/claim-jobs";
import { dispatchVoicePostCallQStashWorker } from "@/lib/queue/qstash-voice-post-call-worker";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/format-error";
import { getVoiceRepository } from "@/repositories/voice.repository";
import {
  createVoicePostCallBooking,
  extractVoicePostCallActionItems,
  syncVoicePostCallToCrm,
  summarizeVoicePostCall,
} from "@/services/voice-post-call-analysis.service";
import { downloadTwilioRecordingAudio } from "@/services/voice-recording.service";
import { transcribeAudioBuffer } from "@/services/voice-transcription.service";
import type { Database, Json } from "@/types/database.types";

type VoicePostCallJobRow =
  Database["public"]["Tables"]["voice_post_call_jobs"]["Row"];
type VoicePostCallJobStatus = "completed" | "failed" | "pending" | "skipped";

const BATCH_SIZE = 10;
const MAX_DRAIN_BATCHES = 5;
const BASE_RETRY_SECONDS = 60;
const STALE_PROCESSING_MS = 15 * 60 * 1000;

let voicePostCallDrainPromise: Promise<VoicePostCallQueueDrainResult> | null =
  null;

export type VoicePostCallQueueDrainResult = {
  processed: number;
  completed: number;
  skipped: number;
  retried: number;
  failed: number;
  batches: number;
  recoveredStale: number;
  durationMs: number;
};

export type VoicePostCallQueueLagMetrics = {
  lagSeconds: number;
  oldestPendingAt: string | null;
  pendingCount: number;
  processingCount: number;
  staleProcessingCount: number;
  failedCount: number;
  skippedCount: number;
  completedLast24h: number;
  failedLast24h: number;
};

type VoicePostCallJobResult =
  | { status: "completed"; message?: string; payload?: Json }
  | { status: "skipped"; message: string; payload?: Json }
  | { status: "retry"; message: string; payload?: Json };

function getTranscriptFromEvents(
  events: Database["public"]["Tables"]["voice_call_events"]["Row"][],
): string | null {
  const transcriptEvent = events.find(
    (event) => event.event_type === "voice_post_call.transcript.created",
  );
  const payload = transcriptEvent?.payload;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const transcript = payload.transcript;
  return typeof transcript === "string" && transcript.trim()
    ? transcript.trim()
    : null;
}

export async function drainVoicePostCallQueue(): Promise<VoicePostCallQueueDrainResult> {
  const startedAt = Date.now();
  const recoveredStale = await recoverStaleVoicePostCallJobs();

  const totals: VoicePostCallQueueDrainResult = {
    processed: 0,
    completed: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
    batches: 0,
    recoveredStale,
    durationMs: 0,
  };

  let batch = await processPendingVoicePostCallJobs();

  while (batch.processed > 0 && totals.batches < MAX_DRAIN_BATCHES) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.skipped += batch.skipped;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingVoicePostCallJobs();
  }

  totals.durationMs = Date.now() - startedAt;
  return totals;
}

export function dispatchVoicePostCallWorker(
  source: "enqueue" | "retry" = "enqueue",
  delaySeconds = 0,
): void {
  if (delaySeconds <= 0) {
    scheduleVoicePostCallProcessingInProcess();
  }

  void dispatchVoicePostCallQStashWorker({ source, delaySeconds });
}

export async function getVoicePostCallQueueLagMetrics(): Promise<VoicePostCallQueueLagMetrics> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    oldestPending,
    pendingCount,
    processingCount,
    staleProcessing,
    failedCount,
    skippedCount,
    completedLast24h,
    failedLast24h,
  ] = await Promise.all([
    admin
      .from("voice_post_call_jobs")
      .select("next_attempt_at")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .lt("processing_started_at", staleBefore),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "skipped"),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("processed_at", since24h),
    admin
      .from("voice_post_call_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("processed_at", since24h),
  ]);

  const oldestPendingAt = oldestPending.data?.next_attempt_at ?? null;
  const lagSeconds = oldestPendingAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(oldestPendingAt).getTime()) / 1000),
      )
    : 0;

  return {
    lagSeconds,
    oldestPendingAt,
    pendingCount: pendingCount.count ?? 0,
    processingCount: processingCount.count ?? 0,
    staleProcessingCount: staleProcessing.count ?? 0,
    failedCount: failedCount.count ?? 0,
    skippedCount: skippedCount.count ?? 0,
    completedLast24h: completedLast24h.count ?? 0,
    failedLast24h: failedLast24h.count ?? 0,
  };
}

function scheduleVoicePostCallProcessingInProcess(): void {
  if (voicePostCallDrainPromise) {
    return;
  }

  voicePostCallDrainPromise = drainVoicePostCallQueue()
    .catch((error) => {
      console.error("[voice-post-call-queue] in-process drain failed", error);
      return {
        processed: 0,
        completed: 0,
        skipped: 0,
        retried: 0,
        failed: 0,
        batches: 0,
        recoveredStale: 0,
        durationMs: 0,
      };
    })
    .finally(() => {
      voicePostCallDrainPromise = null;
    });
}

async function processPendingVoicePostCallJobs(): Promise<
  Omit<VoicePostCallQueueDrainResult, "batches" | "recoveredStale" | "durationMs">
> {
  const jobs = await claimVoicePostCallJobs(BATCH_SIZE);
  const totals = {
    processed: 0,
    completed: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
  };

  for (const job of jobs) {
    totals.processed += 1;

    try {
      await logPostCallJobEvent(job, "voice_post_call.job.started");
      const result = await processVoicePostCallJob(job);

      if (result.status === "completed" || result.status === "skipped") {
        await markVoicePostCallJobFinished(job, result.status, {
          message: result.message ?? null,
          payload: result.payload,
        });
        if (result.status === "completed") {
          await enqueueDependentVoicePostCallJobs(job);
        }
        totals[result.status] += 1;
        continue;
      }

      const retryStatus = await markVoicePostCallJobRetry(job, result.message);
      totals[retryStatus] += 1;
      if (retryStatus === "retried") {
        dispatchVoicePostCallWorker("retry", BASE_RETRY_SECONDS);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const retryStatus = await markVoicePostCallJobRetry(job, message);
      totals[retryStatus] += 1;
      if (retryStatus === "retried") {
        dispatchVoicePostCallWorker("retry", BASE_RETRY_SECONDS);
      }
    }
  }

  return totals;
}

async function enqueueDependentVoicePostCallJobs(
  job: VoicePostCallJobRow,
): Promise<void> {
  const repo = getVoiceRepository();
  const dependentTypes =
    job.job_type === "transcribe"
      ? (["summarize", "extract_actions", "sync_crm", "booking"] as const)
      : job.job_type === "summarize" || job.job_type === "extract_actions"
        ? (["sync_crm", "booking"] as const)
        : [];

  if (dependentTypes.length === 0) {
    return;
  }

  await Promise.allSettled(
    dependentTypes.map((jobType) =>
      repo.enqueuePostCallJob({
        businessId: job.business_id,
        callLogId: job.call_log_id,
        jobType,
        payload: {
          sourceJobId: job.id,
          sourceJobType: job.job_type,
        },
      }),
    ),
  );

  dispatchVoicePostCallWorker("enqueue");
}

async function processVoicePostCallJob(
  job: VoicePostCallJobRow,
): Promise<VoicePostCallJobResult> {
  const repo = getVoiceRepository();
  const call = await repo.findCallLogById(job.business_id, job.call_log_id);

  if (!call) {
    return {
      status: "skipped",
      message: "Call log no longer exists.",
      payload: { reason: "call_log_missing" },
    };
  }

  const session = call.external_call_id
    ? await repo.findSessionByCallSid(call.external_call_id)
    : null;
  const turns = (session?.turns ?? []) as {
    role: "user" | "assistant";
    content: string;
  }[];
  const turnCount = turns.length;
  const events = await repo.listCallEvents(job.business_id, job.call_log_id);
  const existingTranscript = getTranscriptFromEvents(events);

  if (job.job_type === "transcribe") {
    return transcribeVoicePostCallRecording(job, {
      callLogId: call.id,
      callSid: call.external_call_id,
      recordingUrl: call.recording_url,
      conversationId: call.conversation_id,
      existingTranscript,
    });
  }

  let transcriptText = existingTranscript;

  if (!transcriptText && turnCount === 0 && call.recording_url?.trim()) {
    const result = await transcribeVoicePostCallRecording(job, {
      callLogId: call.id,
      callSid: call.external_call_id,
      recordingUrl: call.recording_url,
      conversationId: call.conversation_id,
      existingTranscript: null,
    });

    if (result.status !== "completed") {
      return result;
    }

    transcriptText = getTranscriptFromPayload(result.payload);
  }

  if (turnCount === 0 && !transcriptText && !call.conversation_id) {
    return {
      status: "skipped",
      message: "No transcript or voice session content is available yet.",
      payload: { reason: "transcript_missing" },
    };
  }

  const context = {
    businessId: job.business_id,
    callLogId: job.call_log_id,
    callSid: call.external_call_id,
    contactId: call.contact_id,
    phoneNumber: call.phone_number,
    turns,
    transcriptText,
  };

  if (job.job_type === "summarize") {
    return summarizeVoicePostCall(context);
  }

  if (job.job_type === "extract_actions") {
    return extractVoicePostCallActionItems(context);
  }

  if (job.job_type === "sync_crm") {
    return syncVoicePostCallToCrm(context);
  }

  if (job.job_type === "booking") {
    return createVoicePostCallBooking(context);
  }

  return {
    status: "skipped",
    message: `${job.job_type} automation is not enabled yet.`,
    payload: { reason: "automation_handler_pending", jobType: job.job_type },
  };
}

function getTranscriptFromPayload(payload: Json | undefined): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const transcript = payload.transcript;
  return typeof transcript === "string" && transcript.trim()
    ? transcript.trim()
    : null;
}

async function transcribeVoicePostCallRecording(
  job: VoicePostCallJobRow,
  input: {
    callLogId: string;
    callSid: string | null;
    recordingUrl: string | null;
    conversationId: string | null;
    existingTranscript: string | null;
  },
): Promise<VoicePostCallJobResult> {
  if (input.existingTranscript) {
    return {
      status: "completed",
      message: "Transcript already exists.",
      payload: {
        transcript: input.existingTranscript,
        source: "existing_event",
      },
    };
  }

  if (!input.recordingUrl?.trim()) {
    return {
      status: "skipped",
      message: "No recording is available for this call.",
      payload: { reason: "recording_missing" },
    };
  }

  const recording = await downloadTwilioRecordingAudio({
    businessId: job.business_id,
    recordingUrl: input.recordingUrl,
  });

  if (!recording.success) {
    return {
      status: "retry",
      message: recording.message,
      payload: { reason: "recording_download_failed" },
    };
  }

  const transcript = await transcribeAudioBuffer({
    buffer: recording.buffer,
    fileName: recording.fileName,
    mimeType: recording.mimeType,
    businessId: job.business_id,
    conversationId: input.conversationId,
  });

  if (!transcript) {
    return {
      status: "skipped",
      message: "Transcription provider is not configured or returned no text.",
      payload: { reason: "transcription_unavailable" },
    };
  }

  const payload = {
    transcript,
    recordingUrl: input.recordingUrl,
  };

  await getVoiceRepository().insertCallEvent({
    businessId: job.business_id,
    callLogId: input.callLogId,
    callSid: input.callSid,
    eventType: "voice_post_call.transcript.created",
    actorType: "ai",
    payload,
  });

  return {
    status: "completed",
    message: "Recording transcribed.",
    payload,
  };
}

async function recoverStaleVoicePostCallJobs(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await admin
    .from("voice_post_call_jobs")
    .select("*")
    .eq("status", "processing")
    .lt("processing_started_at", staleBefore)
    .limit(BATCH_SIZE * MAX_DRAIN_BATCHES);

  if (error) {
    console.warn(
      "[voice-post-call-queue] stale recovery select failed",
      formatSupabaseError(error),
    );
    return 0;
  }

  let recovered = 0;

  for (const job of data ?? []) {
    await markVoicePostCallJobRetry(job, "Recovered stale processing job.");
    recovered += 1;
  }

  return recovered;
}

async function markVoicePostCallJobFinished(
  job: VoicePostCallJobRow,
  status: Extract<VoicePostCallJobStatus, "completed" | "skipped">,
  input: {
    message: string | null;
    payload?: Json;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("voice_post_call_jobs")
    .update({
      status,
      payload: input.payload ?? job.payload,
      processed_at: now,
      processing_started_at: null,
      last_error: input.message,
      updated_at: now,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }

  await logPostCallJobEvent(job, `voice_post_call.job.${status}`, {
    message: input.message,
    payload: input.payload ?? null,
  });
}

async function markVoicePostCallJobRetry(
  job: VoicePostCallJobRow,
  message: string,
): Promise<"retried" | "failed"> {
  const admin = createAdminClient();
  const exhausted = job.attempt_count >= job.max_attempts;
  const now = new Date().toISOString();
  const nextAttemptAt = new Date(
    Date.now() + BASE_RETRY_SECONDS * 1000 * 2 ** Math.max(0, job.attempt_count - 1),
  ).toISOString();
  const status = exhausted ? "failed" : "pending";

  const { error } = await admin
    .from("voice_post_call_jobs")
    .update({
      status,
      last_error: message,
      next_attempt_at: exhausted ? now : nextAttemptAt,
      processing_started_at: null,
      processed_at: exhausted ? now : null,
      updated_at: now,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }

  await logPostCallJobEvent(job, `voice_post_call.job.${status}`, {
    message,
    nextAttemptAt: exhausted ? null : nextAttemptAt,
  });

  return exhausted ? "failed" : "retried";
}

async function logPostCallJobEvent(
  job: VoicePostCallJobRow,
  eventType: string,
  payload?: Json,
): Promise<void> {
  await getVoiceRepository()
    .insertCallEvent({
      businessId: job.business_id,
      callLogId: job.call_log_id,
      eventType,
      actorType: "system",
      payload:
        payload ??
        ({
          jobId: job.id,
          jobType: job.job_type,
          attemptCount: job.attempt_count,
        } satisfies Json),
    })
    .catch((error) => {
      console.warn(
        "[voice-post-call-queue] event insert failed",
        error instanceof Error ? error.message : "unknown",
      );
    });
}
