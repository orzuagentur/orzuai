import "server-only";

import { dispatchInboundMediaHydrationWorker } from "@/lib/queue/qstash-inbound-media-worker";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downloadAndStoreTelegramInboundMedia,
  downloadAndStoreUrlInboundMedia,
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
const BASE_RETRY_SECONDS = 30;

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
};

export type InboundMediaHydrationDrainResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
};

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
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at, deleted_for_all_at, hidden_for_business, edited_at, is_edited",
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
  const totals: InboundMediaHydrationDrainResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  let batch = await processPendingInboundMediaHydrations();

  while (batch.processed > 0) {
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.failed += batch.failed;
    totals.skipped += batch.skipped;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingInboundMediaHydrations();
  }

  return totals;
}

export async function processPendingInboundMediaHydrations(): Promise<InboundMediaHydrationDrainResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: candidates } = await admin
    .from("message_attachments")
    .select(
      "message_id, business_id, kind, mime_type, file_name, provider_media_id, status, retry_count, max_retries, next_retry_at, hydration_context, storage_path",
    )
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE * 2);

  const eligible =
    candidates?.filter((attachment) => {
      if (attachment.status === "ready" || attachment.storage_path) {
        return false;
      }

      if (attachment.status === "pending") {
        return true;
      }

      const maxRetries = attachment.max_retries ?? 5;
      const retryCount = attachment.retry_count ?? 0;

      if (retryCount >= maxRetries) {
        return false;
      }

      return !attachment.next_retry_at || attachment.next_retry_at <= now;
    }) ?? [];

  if (eligible.length === 0) {
    return { processed: 0, completed: 0, failed: 0, skipped: 0 };
  }

  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const attachment of eligible.slice(0, BATCH_SIZE)) {
    const result = await runInboundMediaHydration(attachment.message_id);

    if (result.skipped) {
      skipped += 1;
    } else if (result.completed) {
      completed += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: Math.min(eligible.length, BATCH_SIZE),
    completed,
    failed,
    skipped,
  };
}

export async function runInboundMediaHydration(
  messageId: string,
): Promise<{
  completed: boolean;
  skipped: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: attachment } = await admin
    .from("message_attachments")
    .select(
      "message_id, business_id, kind, mime_type, file_name, provider_media_id, status, retry_count, max_retries, next_retry_at, hydration_context, storage_path",
    )
    .eq("message_id", messageId)
    .maybeSingle();

  if (!attachment || attachment.status === "ready" || attachment.storage_path) {
    return { completed: true, skipped: true };
  }

  if (attachment.status === "failed") {
    const maxRetries = attachment.max_retries ?? 5;
    const retryCount = attachment.retry_count ?? 0;

    if (retryCount >= maxRetries) {
      return { completed: false, skipped: true };
    }

    if (attachment.next_retry_at && attachment.next_retry_at > now) {
      return { completed: false, skipped: true };
    }
  }

  const { data: message } = await admin
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at, deleted_for_all_at, hidden_for_business, edited_at, is_edited",
    )
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    return { completed: false, skipped: true, error: "Message not found." };
  }

  if (attachment.status === "failed") {
    await admin
      .from("message_attachments")
      .update({ status: "pending", last_error: null })
      .eq("message_id", messageId);

    await broadcastHydrationState(message as MessageRow, {
      attachment_pending: true,
      attachment_failed: false,
    });
  }

  let content: string | null = null;
  let hydrationError: string | undefined;

  try {
    content = await resolveInboundMediaContent(
      admin,
      attachment as AttachmentRow,
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
    const { data: connection } = await admin
      .from("instagram_connections")
      .select("meta_access_token")
      .eq("business_id", attachment.business_id)
      .maybeSingle();

    const sourceUrl = context.sourceUrl;

    if (!sourceUrl) {
      throw new Error("Instagram media source URL is missing.");
    }

    return downloadAndStoreUrlInboundMedia({
      sourceUrl,
      businessId: attachment.business_id,
      conversationId: message.conversation_id,
      kind,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      caption,
      accessToken: connection?.meta_access_token ?? undefined,
    });
  }

  throw new Error(`Unsupported channel for media hydration: ${message.channel}`);
}
