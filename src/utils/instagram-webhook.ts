import type {
  InstagramTypingEvent,
  InstagramWebhookMessage,
  InstagramWebhookPayload,
} from "@/types/instagram.types";

function resolveInstagramMediaKind(
  attachmentType: string,
): "image" | "audio" | "document" | "video" | null {
  if (attachmentType === "image") {
    return "image";
  }

  if (attachmentType === "video") {
    return "video";
  }

  if (attachmentType === "audio") {
    return "audio";
  }

  if (attachmentType === "file") {
    return "document";
  }

  return null;
}

export function parseInstagramWebhookPayload(
  payload: InstagramWebhookPayload,
): InstagramWebhookMessage[] {
  if (payload.object !== "instagram") {
    return [];
  }

  const messages: InstagramWebhookMessage[] = [];

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id;

    if (!pageId) {
      continue;
    }

    for (const event of entry.messaging ?? []) {
      if (!event.sender?.id || event.message?.is_echo) {
        continue;
      }

      const messageId =
        event.message?.mid ?? `${event.timestamp ?? Date.now()}`;
      const timestamp = event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString();
      const contactName = "Instagram User";

      if (event.message?.text?.trim()) {
        messages.push({
          kind: "text",
          messageId,
          from: event.sender.id,
          timestamp,
          body: event.message.text.trim(),
          contactName,
          pageId,
        });
        continue;
      }

      const attachment = event.message?.attachments?.[0];
      const sourceUrl = attachment?.payload?.url;
      const mediaKind = attachment?.type
        ? resolveInstagramMediaKind(attachment.type)
        : null;

      if (!sourceUrl || !mediaKind) {
        continue;
      }

      messages.push({
        kind: "media",
        messageId,
        from: event.sender.id,
        timestamp,
        contactName,
        pageId,
        sourceUrl,
        mediaKind,
        fileName: attachment.type === "file" ? "file" : attachment.type,
      });
    }
  }

  return messages;
}

export function parseInstagramWebhookTypingEvents(
  payload: InstagramWebhookPayload,
): InstagramTypingEvent[] {
  if (payload.object !== "instagram") {
    return [];
  }

  const events: InstagramTypingEvent[] = [];

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id;

    if (!pageId) {
      continue;
    }

    for (const event of entry.messaging ?? []) {
      if (!event.sender?.id || !event.sender_action) {
        continue;
      }

      if (
        event.sender_action !== "typing_on" &&
        event.sender_action !== "typing_off"
      ) {
        continue;
      }

      events.push({
        kind: "typing",
        from: event.sender.id,
        pageId,
        isTyping: event.sender_action === "typing_on",
        timestamp: event.timestamp
          ? new Date(event.timestamp).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  return events;
}
