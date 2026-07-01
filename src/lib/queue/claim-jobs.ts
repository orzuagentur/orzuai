import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/format-error";
import type { Database } from "@/types/database.types";

type AiReplyJobRow = Database["public"]["Tables"]["ai_reply_jobs"]["Row"];

type WebhookJob = Database["public"]["Tables"]["inbound_webhook_queue"]["Row"];
type DeliveryJob = Database["public"]["Tables"]["message_deliveries"]["Row"];
type AttachmentJob = Database["public"]["Tables"]["message_attachments"]["Row"];
type VoicePostCallJob =
  Database["public"]["Tables"]["voice_post_call_jobs"]["Row"];

export async function claimInboundWebhookJobs(
  limit: number,
): Promise<WebhookJob[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_inbound_webhook_jobs", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function claimMessageDeliveryJobs(
  limit: number,
): Promise<DeliveryJob[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_message_delivery_jobs", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function claimMessageDeliveryJob(
  messageId: string,
): Promise<DeliveryJob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_message_delivery_job", {
    p_message_id: messageId,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function claimInboundMediaHydrationJobs(
  limit: number,
): Promise<AttachmentJob[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_inbound_media_hydration_jobs", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function claimInboundMediaHydrationJob(
  messageId: string,
): Promise<AttachmentJob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_inbound_media_hydration_job", {
    p_message_id: messageId,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function claimAiReplyJobs(
  limit: number,
): Promise<AiReplyJobRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_ai_reply_jobs", {
    p_limit: limit,
  });

  if (!error) {
    return data ?? [];
  }

  console.warn(
    "[claim-jobs] claim_ai_reply_jobs RPC failed, falling back to direct claim",
    formatSupabaseError(error),
  );

  return claimAiReplyJobsDirect(admin, limit);
}

async function claimAiReplyJobsDirect(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
): Promise<AiReplyJobRow[]> {
  const now = new Date().toISOString();

  const { data: candidates, error } = await admin
    .from("ai_reply_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  if (!candidates?.length) {
    return [];
  }

  const claimed: AiReplyJobRow[] = [];

  for (const job of candidates) {
    if ((job.pending_messages?.length ?? 0) === 0) {
      continue;
    }

    const { data: updated, error: claimError } = await admin
      .from("ai_reply_jobs")
      .update({ status: "processing", updated_at: now })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimError) {
      console.warn(
        "[claim-jobs] direct ai reply claim failed",
        formatSupabaseError(claimError),
      );
      continue;
    }

    if (updated) {
      claimed.push(updated);
    }
  }

  return claimed;
}

export async function claimAiOrchestrationJobs(
  limit: number,
): Promise<Database["public"]["Tables"]["ai_orchestration_jobs"]["Row"][]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_ai_orchestration_jobs", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function claimVoicePostCallJobs(
  limit: number,
): Promise<VoicePostCallJob[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_voice_post_call_jobs", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}
