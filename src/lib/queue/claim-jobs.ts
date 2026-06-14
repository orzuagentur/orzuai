import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type WebhookJob = Database["public"]["Tables"]["inbound_webhook_queue"]["Row"];
type DeliveryJob = Database["public"]["Tables"]["message_deliveries"]["Row"];
type AttachmentJob = Database["public"]["Tables"]["message_attachments"]["Row"];

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
