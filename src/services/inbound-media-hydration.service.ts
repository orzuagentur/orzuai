import "server-only";

import { dispatchInboundMediaHydrationWorker } from "@/lib/queue/qstash-inbound-media-worker";
import {
  claimInboundMediaHydrationJob,
  claimInboundMediaHydrationJobs,
} from "@/lib/queue/claim-jobs";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downloadAndStoreTelegramInboundMedia,
  downloadAndStoreWhatsAppInboundMedia,
} from "@/services/inbound-media.service";
import { recomputeConversationLastMessage } from "@/services/conversation-last-message.service";
import { broadcastConversationMessageUpdated } from "@/services/conversation-realtime-broadcast.service";
import {
  markMessageAttachmentFailed,
  markMessageAttachmentReady,
  resetMessageAttachmentForRetry,
  saveMessageAttachmentHydrationContext,
} from "@/services/message-attachment.service";
import { updateChannelMessageContent } from "@/services/messaging.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseMediaMessage,
  type ChatMediaKind,
} from "@/utils/chat-media";

type InboundMediaDbClient = SupabaseClient<Database>;

export type InboundMediaHydrationContext = {
  sourceUrl?: string;
  caption?: string;
};

const BATCH_SIZE = 15;
const MAX_DRAIN_BATCHES = 20;
const BASE_RETRY_SECONDS = 30;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type AttachmentRow = {
  message_id: string;
  business_id: string;
  kind: Database["public"]["Enums"]["message_attachment_kind"];
  mime_type: string;
  file_name: string;
  provider_media_id: string | null;
  status: Database["public"]["Enums"]["message_attachment_status"];
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  hydration_context: InboundMediaHydrationContext | null;
  storage_path: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: Database["public"]["Enums"]["message_sender_type"];
  content: string;
  ai_generated: boolean;
  created_at: string;
  deleted_for_all_at: string | null;
  hidden_for_business: boolean;
  edited_at: string | null;
  is_edited: boolean;
  external_message_id: string | null;
};

export type InboundMediaHydrationLagMetrics = {
  pendingCount: number;
  failedCount: number;
  lagSeconds: number;
  oldestPendingAt: string | null;
  staleProcessingCount: number;
};

export type InboundMediaHydrationDrainResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  recoveredStale: number;
  batches: number;
  durationMs: number;
};

export async function recoverStaleInboundMediaHydrations(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data } = await admin
    .from("message_attachments")
    .update({ status: "pending" })
    .eq("status", "processing")
    .is("storage_path", null)
    .lt("updated_at", staleBefore)
    .select("message_id");

  return data?.length ?? 0;
}

export async function getInboundMediaHydrationLagMetrics(): Promise<InboundMediaHydrationLagMetrics> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const nowMs = Date.now();

  const [pending, failed, oldestPending, staleProcessing] = await Promise.all([
    admin
      .from("message_attachments")
      .select("message_id", { count: "exact", head: true })
      .is("storage_path", null)
      .in("status", ["pending", "processing"]),
    admin
      .from("message_attachments")
      .select("message_id", { count: "exact", head: true })
      .is("storage_path", null)
      .eq("status", "failed"),
    admin
      .from("message_attachments")
      .select("created_at")
      .is("storage_path", null)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("message_attachments")
      .select("message_id", { count: "exact", head: true })
      .eq("status", "processing")
      .is("storage_path", null)
      .lt("updated_at", staleBefore),
  ]);

  const oldestPendingAt = oldestPending.data?.created_at ?? null;
  const lagSeconds = oldestPendingAt
    ? Math.max(0, Math.floor((nowMs - Date.parse(oldestPendingAt)) / 1000))
    : 0;

  return {
    pendingCount: pending.count ?? 0,
    failedCount: failed.count ?? 0,
    lagSeconds,
    oldestPendingAt,
    staleProcessingCount: staleProcessing.count ?? 0,
  };
}

export function scheduleInboundMediaHydration(input: {
  admin: InboundMediaDbClient;
  messageId: string;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  kind: ChatMediaKind;
  fileName?: string;
  mimeType?: string;
  caption?: string;
  providerMediaId?: string;
  sourceUrl?: string;
}): void {
  void (async () => {
    await saveMessageAttachmentHydrationContext(input.admin, {
      messageId: input.messageId,
      providerMediaId: input.providerMediaId,
      context: {
        caption: input.caption,
        sourceUrl: input.sourceUrl,
      },
    });

    dispatchInboundMediaHydrationWorker({ messageId: input.messageId });
    await runInboundMediaHydration(input.messageId);
  })().catch((error) => {
    console.error("[inbound-media] schedule hydration failed", error);
  });
}

export async function retryInboundMediaHydration(
  messageId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const reset = await resetMessageAttachmentForRetry(admin, messageId);

  if (!reset) {
    return { success: false, error: "Attachment is not eligible for retry." };
  }

  const { data: message } = await admin
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at, deleted_for_all_at, hidden_for_business, edited_at, is_edited, external_message_id",
    )
    .eq("id", messageId)
    .maybeSingle();

  if (message) {
    await broadcastHydrationState(message as MessageRow, {
      attachment_pending: true,
      attachment_failed: false,
    });
  }

  dispatchInboundMediaHydrationWorker({ messageId });
  const result = await runInboundMediaHydration(messageId);

  return {
    success: result.completed,
    error: result.error,
  };
}

export async function drainInboundMediaHydrationQueue(): Promise<InboundMediaHydrationDrainResult> {
  const startedAt = Date.now();
  const recoveredStale = await recoverStaleInboundMediaHydrations();

  const totals: InboundMediaHydrationDrainResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    recoveredStale,
    batches: 0,
    durationMs: 0,
  };

  let batch = await processPendingInboundMediaHydrations();

  while (batch.processed > 0 && totals.batches < MAX_DRAIN_BATCHES) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.failed += batch.failed;
    totals.skipped += batch.skipped;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingInboundMediaHydrations();
  }

  totals.durationMs = Date.now() - startedAt;

  if (totals.processed > 0) {
    console.info("[inbound-media] drain complete", totals);
  }

  return totals;
}

export async function processPendingInboundMediaHydrations(): Promise<InboundMediaHydrationDrainResult> {
  const claimed = await claimInboundMediaHydrationJobs(BATCH_SIZE);

  if (claimed.length === 0) {
    return {
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      recoveredStale: 0,
      batches: 0,
      durationMs: 0,
    };
  }

  const outcomes = await runWithConcurrency(
    claimed,
    getWorkerConcurrency(),
    (attachment) =>
      processClaimedInboundMediaHydration(attachment as AttachmentRow),
  );

  return {
    processed: claimed.length,
    completed: outcomes.filter((outcome) => outcome.completed).length,
    failed: outcomes.filter(
      (outcome) => !outcome.completed && !outcome.skipped,
    ).length,
    skipped: outcomes.filter((outcome) => outcome.skipped).length,
    recoveredStale: 0,
    batches: 0,
    durationMs: 0,
  };
}

export async function runInboundMediaHydration(
  messageId: string,
): Promise<{
  completed: boolean;
  skipped: boolean;
  error?: string;
}> {
  await recoverStaleInboundMediaHydrations();

  const claimed = await claimInboundMediaHydrationJob(messageId);

  if (!claimed) {
    return { completed: true, skipped: true };
  }

  return processClaimedInboundMediaHydration(claimed as AttachmentRow);
}

async function processClaimedInboundMediaHydration(
  attachment: AttachmentRow,
): Promise<{
  completed: boolean;
  skipped: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  const messageId = attachment.message_id;

  if (attachment.storage_path) {
    return { completed: true, skipped: true };
  }

  const { data: message } = await admin
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at, deleted_for_all_at, hidden_for_business, edited_at, is_edited, external_message_id",
    )
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    await markMessageAttachmentFailed(admin, {
      messageId,
      error: "Message not found.",
      retryCount: attachment.retry_count ?? 0,
      nextRetryAt: null,
    });
    return { completed: false, skipped: true, error: "Message not found." };
  }

  await broadcastHydrationState(message as MessageRow, {
    attachment_pending: true,
    attachment_failed: false,
  });

  let content: string | null = null;
  let hydrationError: string | undefined;

  try {
    content = await resolveInboundMediaContent(
      admin,
      attachment,
      message as MessageRow,
    );
  } catch (error) {
    hydrationError =
      error instanceof Error ? error.message : "Inbound media hydration failed.";
  }

  if (!content) {
    const errorMessage = hydrationError ?? "Unable to download inbound media.";
    const retryCount = (attachment.retry_count ?? 0) + 1;
    const maxRetries = attachment.max_retries ?? 5;
    const exhausted = retryCount >= maxRetries;
    const delaySeconds = BASE_RETRY_SECONDS * 2 ** (retryCount - 1);

    await markMessageAttachmentFailed(admin, {
      messageId,
      error: errorMessage,
      retryCount,
      nextRetryAt: exhausted
        ? null
        : new Date(Date.now() + delaySeconds * 1000).toISOString(),
    });

    if (!exhausted) {
      void dispatchInboundMediaHydrationWorker({
        messageId,
        delaySeconds,
      });
    }

    await broadcastHydrationState(message as MessageRow, {
      attachment_pending: false,
      attachment_failed: true,
    });

    return { completed: false, skipped: false, error: errorMessage };
  }

  await updateChannelMessageContent(admin, {
    messageId,
    content,
  });

  const { media } = parseMediaMessage(content);

  if (media) {
    await markMessageAttachmentReady(admin, {
      messageId,
      media,
    });
  }

  const updatedMessage = {
    ...(message as MessageRow),
    content,
  };

  if (updatedMessage.conversation_id) {
    await recomputeConversationLastMessage(
      admin,
      updatedMessage.conversation_id,
    );
  }

  await broadcastHydrationState(updatedMessage, {
    attachment_pending: false,
    attachment_failed: false,
    content,
  });

  return { completed: true, skipped: false };
}

async function broadcastHydrationState(
  message: MessageRow,
  state: {
    attachment_pending: boolean;
    attachment_failed: boolean;
    content?: string;
  },
): Promise<void> {
  if (!message.conversation_id) {
    return;
  }

  void broadcastConversationMessageUpdated(message.conversation_id, {
    id: message.id,
    conversation_id: message.conversation_id,
    channel: message.channel,
    sender_type: message.sender_type,
    content: state.content ?? message.content,
    ai_generated: message.ai_generated,
    created_at: message.created_at,
    deleted_for_all_at: message.deleted_for_all_at,
    hidden_for_business: message.hidden_for_business,
    edited_at: message.edited_at,
    is_edited: message.is_edited,
    attachment_pending: state.attachment_pending,
    attachment_failed: state.attachment_failed,
  }).catch((error) => {
    console.error("[inbound-media] hydration broadcast failed", error);
  });
}

async function resolveInboundMediaContent(
  admin: InboundMediaDbClient,
  attachment: AttachmentRow,
  message: MessageRow,
): Promise<string | null> {
  const context = (attachment.hydration_context ??
    {}) as InboundMediaHydrationContext;
  const { text: captionFromContent } = parseMediaMessage(message.content);
  const caption = context.caption ?? captionFromContent;
  const kind = attachment.kind as ChatMediaKind;
  const messageId = attachment.message_id;

  if (message.channel === "whatsapp") {
    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("meta_access_token")
      .eq("business_id", attachment.business_id)
      .maybeSingle();

    if (!connection?.meta_access_token || !attachment.provider_media_id) {
      throw new Error("WhatsApp media credentials are unavailable.");
    }

    return downloadAndStoreWhatsAppInboundMedia({
      messageId,
      accessToken: connection.meta_access_token,
      mediaId: attachment.provider_media_id,
      businessId: attachment.business_id,
      conversationId: message.conversation_id,
      kind,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      caption,
    });
  }

  if (message.channel === "telegram") {
    const { data: connection } = await admin
      .from("telegram_connections")
      .select("bot_token")
      .eq("business_id", attachment.business_id)
      .maybeSingle();

    if (!connection?.bot_token || !attachment.provider_media_id) {
      throw new Error("Telegram media credentials are unavailable.");
    }

    return downloadAndStoreTelegramInboundMedia({
      messageId,
      botToken: connection.bot_token,
      fileId: attachment.provider_media_id,
      businessId: attachment.business_id,
      conversationId: message.conversation_id,
      kind,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      caption,
    });
  }

  if (message.channel === "instagram") {
    return null;
  }

  throw new Error(`Unsupported channel for media hydration: ${message.channel}`);
}
