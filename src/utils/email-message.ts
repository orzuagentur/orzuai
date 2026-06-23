import type { ChatMessageData } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";

const LEGACY_SUBJECT_PREFIX = /^Subject:\s*(.+?)(?:\r?\n\r?\n|\n)([\s\S]*)$/;

export function buildEmailReplySubject(
  previousSubject: string | null | undefined,
  fallback = "Message from your business",
): string {
  const trimmed = previousSubject?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (/^re:/i.test(trimmed)) {
    return trimmed;
  }

  return `Re: ${trimmed}`;
}

export function parseLegacyEmailContent(content: string): {
  subject: string | null;
  body: string;
} {
  const match = content.match(LEGACY_SUBJECT_PREFIX);

  if (!match) {
    return { subject: null, body: content };
  }

  return {
    subject: match[1]?.trim() || null,
    body: match[2] ?? "",
  };
}

export function resolveEmailMessageParts(message: {
  channel: MessagingChannel;
  content: string;
  emailSubject?: string | null;
}): { subject: string | null; body: string } {
  if (message.channel !== "email") {
    return { subject: null, body: message.content };
  }

  if (message.emailSubject?.trim()) {
    return {
      subject: message.emailSubject.trim(),
      body: message.content,
    };
  }

  return parseLegacyEmailContent(message.content);
}

export function formatEmailListPreview(
  subject: string | null,
  body: string,
): string {
  const trimmedBody = body.trim();

  if (subject?.trim()) {
    return trimmedBody ? `${subject.trim()} — ${trimmedBody}` : subject.trim();
  }

  return trimmedBody;
}

export function getLastEmailSubjectFromMessages(
  messages: Pick<ChatMessageData, "channel" | "content" | "emailSubject">[],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!message || message.channel !== "email") {
      continue;
    }

    const { subject } = resolveEmailMessageParts(message);

    if (subject) {
      return subject;
    }
  }

  return null;
}

export function deriveDefaultEmailReplySubject(
  messages: Pick<ChatMessageData, "channel" | "content" | "emailSubject">[],
): string {
  return buildEmailReplySubject(getLastEmailSubjectFromMessages(messages));
}
