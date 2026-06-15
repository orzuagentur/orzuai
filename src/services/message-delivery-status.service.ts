import "server-only";

import type { MessageDeliveryStatus } from "@/types/database.types";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

const DELIVERY_STATUS_RANK: Record<MessageDeliveryStatus, number> = {
  failed: -1,
  pending: 0,
  processing: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

function mapWhatsAppProviderStatus(
  status: string,
): MessageDeliveryStatus | null {
  if (status === "sent") {
    return "sent";
  }

  if (status === "delivered") {
    return "delivered";
  }

  if (status === "read") {
    return "read";
  }

  if (status === "failed") {
    return "failed";
  }

  return null;
}

export async function advanceMessageDeliveryStatus(
  admin: MessagingDbClient,
  input: {
    messageId?: string;
    providerMessageId?: string;
    status: MessageDeliveryStatus;
  },
): Promise<boolean> {
  if (!input.messageId && !input.providerMessageId) {
    return false;
  }

  if (input.status === "pending" || input.status === "processing") {
    return false;
  }

  let query = admin
    .from("message_deliveries")
    .select("id, status");

  if (input.messageId) {
    query = query.eq("message_id", input.messageId);
  } else {
    query = query.eq("provider_message_id", input.providerMessageId!);
  }

  const { data: delivery } = await query.maybeSingle();

  if (!delivery) {
    return false;
  }

  const currentRank = DELIVERY_STATUS_RANK[delivery.status] ?? 0;
  const nextRank = DELIVERY_STATUS_RANK[input.status] ?? 0;

  if (nextRank <= currentRank) {
    return false;
  }

  const { error } = await admin
    .from("message_deliveries")
    .update({ status: input.status })
    .eq("id", delivery.id);

  return !error;
}

export async function applyWhatsAppDeliveryStatusUpdates(
  admin: MessagingDbClient,
  statuses: Array<{ providerMessageId: string; status: string }>,
): Promise<number> {
  let applied = 0;

  for (const item of statuses) {
    const mapped = mapWhatsAppProviderStatus(item.status);

    if (!mapped) {
      continue;
    }

    const updated = await advanceMessageDeliveryStatus(admin, {
      providerMessageId: item.providerMessageId,
      status: mapped,
    });

    if (updated) {
      applied += 1;
    }
  }

  return applied;
}
