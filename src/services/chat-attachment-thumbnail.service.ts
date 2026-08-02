import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { putMediaObject } from "@/lib/storage/media-storage";
import {
  dispatchOutboundThumbnailWorker,
  getOutboundThumbnailRetryDelaySeconds,
} from "@/lib/queue/qstash-outbound-thumbnail-worker";
import { updateChannelMessageContent } from "@/services/messaging.service";
import { markMessageAttachmentReady } from "@/services/message-attachment.service";
import { downloadChatAttachmentBuffer } from "@/services/chat-attachment-signed-url.service";
import { generateImageThumbnailBuffer } from "@/utils/image-thumbnail";
import { buildThumbnailStoragePath } from "@/utils/chat-attachment-path";
import {
  encodeMediaMessage,
  parseMediaMessage,
  type ChatMediaPayload,
} from "@/utils/chat-media";

export function scheduleOutboundAttachmentThumbnail(input: {
  messageId: string;
  businessId: string;
  storagePath: string;
  mimeType: string;
}): void {
  if (!input.mimeType.startsWith("image/")) {
    return;
  }

  void (async () => {
    const { dispatched } = await dispatchOutboundThumbnailWorker({
      messageId: input.messageId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      attempt: 1,
    });

    if (!dispatched) {
      await runOutboundAttachmentThumbnail({
        messageId: input.messageId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        attempt: 1,
        maxAttempts: 3,
      });
    }
  })().catch((error) => {
    console.error("[chat-attachments] thumbnail worker failed", error);
  });
}

export async function runOutboundAttachmentThumbnail(input: {
  messageId: string;
  storagePath: string;
  mimeType: string;
  attempt?: number;
  maxAttempts?: number;
}): Promise<{ completed: boolean; error?: string }> {
  const attempt = input.attempt ?? 1;
  const maxAttempts = input.maxAttempts ?? 3;

  if (!input.mimeType.startsWith("image/")) {
    return { completed: true };
  }

  try {
    const attached = await generateAndAttachChatThumbnail({
      messageId: input.messageId,
      storagePath: input.storagePath,
    });

    if (attached) {
      return { completed: true };
    }

    const error = "Thumbnail generation returned empty result.";

    if (attempt < maxAttempts) {
      const nextAttempt = attempt + 1;
      dispatchOutboundThumbnailWorker({
        messageId: input.messageId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        attempt: nextAttempt,
        delaySeconds: getOutboundThumbnailRetryDelaySeconds(nextAttempt),
      });
      console.warn("[chat-attachments] thumbnail retry scheduled", {
        messageId: input.messageId,
        attempt: nextAttempt,
      });
      return { completed: false, error };
    }

    console.error("[chat-attachments] thumbnail exhausted retries", {
      messageId: input.messageId,
      attempt,
      error,
    });
    return { completed: false, error };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Thumbnail generation failed.";

    if (attempt < maxAttempts) {
      const nextAttempt = attempt + 1;
      dispatchOutboundThumbnailWorker({
        messageId: input.messageId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        attempt: nextAttempt,
        delaySeconds: getOutboundThumbnailRetryDelaySeconds(nextAttempt),
      });
      console.warn("[chat-attachments] thumbnail retry scheduled", {
        messageId: input.messageId,
        attempt: nextAttempt,
        error: message,
      });
      return { completed: false, error: message };
    }

    console.error("[chat-attachments] thumbnail exhausted retries", {
      messageId: input.messageId,
      attempt,
      error: message,
    });
    return { completed: false, error: message };
  }
}

async function generateAndAttachChatThumbnail(input: {
  messageId: string;
  storagePath: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const sourceBuffer = await downloadChatAttachmentBuffer(input.storagePath);

  if (!sourceBuffer) {
    return false;
  }

  const thumbnail = await generateImageThumbnailBuffer(sourceBuffer);

  if (!thumbnail) {
    return false;
  }

  const thumbnailPath = buildThumbnailStoragePath(input.storagePath);
  const thumbUploaded = await putMediaObject({
    ref: thumbnailPath,
    body: thumbnail.buffer,
    contentType: "image/jpeg",
    upsert: true,
  });

  if (!thumbUploaded) {
    throw new Error("Unable to store attachment thumbnail.");
  }

  const { data: messageRow } = await admin
    .from("messages")
    .select("id, content")
    .eq("id", input.messageId)
    .maybeSingle();

  if (!messageRow?.content) {
    return false;
  }

  const { media, text } = parseMediaMessage(messageRow.content);

  if (!media || media.thumbPath) {
    return Boolean(media?.thumbPath);
  }

  const enrichedMedia: ChatMediaPayload = {
    ...media,
    thumbPath: thumbnailPath,
    thumbWidth: thumbnail.width,
    thumbHeight: thumbnail.height,
  };

  await updateChannelMessageContent(admin, {
    messageId: input.messageId,
    content: encodeMediaMessage(enrichedMedia, text),
  });

  await markMessageAttachmentReady(admin, {
    messageId: input.messageId,
    media: enrichedMedia,
  });

  return true;
}
