import type {
  InstagramWebhookMessage,
  InstagramWebhookPayload,
} from "@/types/instagram.types";

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
      const text = event.message?.text?.trim();

      if (!text || !event.sender?.id || event.message?.is_echo) {
        continue;
      }

      messages.push({
        messageId: event.message?.mid ?? `${event.timestamp ?? Date.now()}`,
        from: event.sender.id,
        timestamp: event.timestamp
          ? new Date(event.timestamp).toISOString()
          : new Date().toISOString(),
        body: text,
        contactName: "Instagram User",
        pageId,
      });
    }
  }

  return messages;
}
