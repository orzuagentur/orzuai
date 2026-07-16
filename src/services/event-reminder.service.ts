import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendChannelAutoReplyText } from "@/services/channels/channel-auto-reply-send.service";
import { insertChannelMessage } from "@/services/messaging.service";
import type { Database, MessagingChannel } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;
type ReminderJobRow = Database["public"]["Tables"]["event_reminder_jobs"]["Row"];

const CLAIM_BATCH_SIZE = 50;
const HOUR_MS = 60 * 60 * 1000;

export async function findUpcomingEventsForContact(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactName: string;
  contactEmail?: string | null;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    isBooking: boolean;
  }>
> {
  const limit = input.limit ?? 5;
  const nowIso = new Date().toISOString();
  const email = input.contactEmail?.trim().toLowerCase() || "";
  const name = input.contactName.trim().toLowerCase();

  const { data } = await input.admin
    .from("calendar_events")
    .select("id, title, start_at, end_at, is_booking, customer_name, customer_email")
    .eq("business_id", input.businessId)
    .gte("start_at", nowIso)
    .order("start_at", { ascending: true })
    .limit(40);

  const matched = (data ?? []).filter((row) => {
    const rowEmail = (row.customer_email ?? "").trim().toLowerCase();
    const rowName = (row.customer_name ?? "").trim().toLowerCase();
    if (email && rowEmail && rowEmail === email) return true;
    if (name && rowName && (rowName === name || rowName.includes(name) || name.includes(rowName))) {
      return true;
    }
    return false;
  });

  return matched.slice(0, limit).map((row) => ({
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    isBooking: Boolean(row.is_booking),
  }));
}

export async function scheduleEventReminderJob(input: {
  admin?: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId?: string | null;
  eventId: string;
  eventStartAt: string;
  hoursBefore?: number;
  messageBody?: string;
  eventTitle?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = input.admin ?? createAdminClient();
  const hoursBefore = Math.max(1, Math.min(168, input.hoursBefore ?? 24));
  const startMs = new Date(input.eventStartAt).getTime();

  if (Number.isNaN(startMs)) {
    return { success: false, message: "Invalid event start time." };
  }

  const scheduledAtMs = startMs - hoursBefore * HOUR_MS;
  if (scheduledAtMs <= Date.now()) {
    return {
      success: false,
      message: "Reminder time is already in the past for this event.",
    };
  }

  const title = input.eventTitle?.trim() || "your appointment";
  const messageBody = (
    input.messageBody?.trim() ||
    `Reminder: ${title} is coming up soon. Reply if you need to reschedule or cancel.`
  ).slice(0, 2000);

  const { error } = await admin.from("event_reminder_jobs").upsert(
    {
      business_id: input.businessId,
      conversation_id: input.conversationId,
      contact_id: input.contactId ?? null,
      event_id: input.eventId,
      channel: input.channel,
      hours_before: hoursBefore,
      scheduled_at: new Date(scheduledAtMs).toISOString(),
      message_body: messageBody,
      status: "pending",
      attempt_count: 0,
      last_error: null,
    },
    { onConflict: "event_id,hours_before" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

async function markReminderRetry(
  admin: MessagingDbClient,
  job: ReminderJobRow,
  errorMessage: string,
): Promise<void> {
  const attemptCount = (job.attempt_count ?? 0) + 1;
  const exhausted = attemptCount >= (job.max_attempts ?? 3);
  const patch: Database["public"]["Tables"]["event_reminder_jobs"]["Update"] = {
    status: exhausted ? "failed" : "pending",
    attempt_count: attemptCount,
    last_error: errorMessage.slice(0, 500),
  };
  if (!exhausted) {
    patch.scheduled_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  await admin.from("event_reminder_jobs").update(patch).eq("id", job.id);
}

export async function runDueEventReminders(): Promise<{
  processed: number;
  sent: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, sent: 0 };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_event_reminder_jobs", {
    p_limit: CLAIM_BATCH_SIZE,
  });

  if (error) {
    console.error("[event-reminders] claim failed", error.message);
    return { processed: 0, sent: 0 };
  }

  const jobs = (data ?? []) as ReminderJobRow[];
  let sent = 0;

  for (const job of jobs) {
    const { data: event } = await admin
      .from("calendar_events")
      .select("id, title, start_at")
      .eq("id", job.event_id)
      .eq("business_id", job.business_id)
      .maybeSingle();

    if (!event) {
      await admin
        .from("event_reminder_jobs")
        .update({ status: "cancelled", last_error: "event_missing" })
        .eq("id", job.id);
      continue;
    }

    if (new Date(event.start_at).getTime() <= Date.now()) {
      await admin
        .from("event_reminder_jobs")
        .update({ status: "cancelled", last_error: "event_started" })
        .eq("id", job.id);
      continue;
    }

    const body =
      job.message_body?.trim() ||
      `Reminder: ${event.title} is coming up soon.`;

    const sendResult = await sendChannelAutoReplyText({
      admin,
      businessId: job.business_id,
      channel: job.channel,
      conversationId: job.conversation_id,
      text: body,
    });

    if (!sendResult.success || !sendResult.sentText) {
      await markReminderRetry(
        admin,
        job,
        sendResult.error ?? "send_failed",
      );
      continue;
    }

    await insertChannelMessage(admin, {
      conversationId: job.conversation_id,
      channel: job.channel,
      content: sendResult.sentText,
      senderType: "ai",
      aiGenerated: true,
    });

    await admin
      .from("event_reminder_jobs")
      .update({ status: "completed", last_error: null })
      .eq("id", job.id);

    sent += 1;
  }

  return { processed: jobs.length, sent };
}
