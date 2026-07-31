import { parseMillisToIso } from "@/utils/message-timestamp";

type GmailHeader = { name?: string; value?: string };

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
};

export type ParsedGmailMessage = {
  id: string;
  threadId: string | null;
  from: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  snippet: string;
  sentAt?: string;
  /**
   * True when the message looks like automated/bulk mail (no-reply senders,
   * mailing lists, notifications, verification codes). The AI must not
   * auto-reply to these — they are still imported so the user can read them.
   */
  isAutomated: boolean;
};

const AUTOMATED_SENDER_PATTERN =
  /(^|[._+-])(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|bounce[sd]?|notification[s]?|notify|alert[s]?|automated|auto-?confirm|mailer|newsletter|no\.reply)([._+-]|@|$)/i;

function headerValue(headers: GmailHeader[], name: string): string | null {
  const target = name.toLowerCase();
  return (
    headers.find((h) => h.name?.toLowerCase() === target)?.value?.trim() ?? null
  );
}

/** Detect automated / bulk / transactional mail that should not be auto-replied to. */
function detectAutomatedEmail(
  headers: GmailHeader[],
  fromEmail: string,
): boolean {
  if (AUTOMATED_SENDER_PATTERN.test(fromEmail)) {
    return true;
  }

  const autoSubmitted = headerValue(headers, "auto-submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") {
    return true;
  }

  const precedence = headerValue(headers, "precedence")?.toLowerCase();
  if (
    precedence &&
    ["bulk", "list", "junk", "auto_reply", "auto-reply"].includes(precedence)
  ) {
    return true;
  }

  // Mailing-list / bulk marketing / notification infrastructure headers.
  if (
    headerValue(headers, "list-unsubscribe") ||
    headerValue(headers, "list-id") ||
    headerValue(headers, "feedback-id") ||
    headerValue(headers, "x-auto-response-suppress")
  ) {
    return true;
  }

  return false;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(padded, "base64").toString("utf8");
}

function extractBodyFromPart(part: GmailMessagePart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts?.length) {
    for (const child of part.parts) {
      const text = extractBodyFromPart(child);
      if (text) {
        return text;
      }
    }
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    const html = decodeBase64Url(part.body.data);
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return "";
}

function parseFromHeader(value: string): { name: string; email: string } {
  const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);

  if (!match?.[2]) {
    return { name: value, email: value.toLowerCase() };
  }

  const name = match[1]?.trim() || match[2];
  const email = match[2].trim().toLowerCase();

  return { name, email };
}

export function parseGmailApiMessage(message: {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart & { headers?: GmailHeader[] };
}): ParsedGmailMessage | null {
  if (!message.id || !message.payload) {
    return null;
  }

  const headers = message.payload.headers ?? [];
  const fromHeader =
    headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
  const subject =
    headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(No subject)";
  const { name, email } = parseFromHeader(fromHeader);
  const body =
    extractBodyFromPart(message.payload) ||
    message.snippet?.trim() ||
    subject;

  return {
    id: message.id,
    threadId: message.threadId ?? null,
    from: fromHeader,
    fromEmail: email,
    fromName: name,
    subject,
    body,
    snippet: message.snippet ?? body.slice(0, 200),
    sentAt: parseMillisToIso(message.internalDate),
    isAutomated: detectAutomatedEmail(headers, email),
  };
}
