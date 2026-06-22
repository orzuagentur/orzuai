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
};

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

  const content = `Subject: ${subject}\n\n${body}`.trim();

  return {
    id: message.id,
    threadId: message.threadId ?? null,
    from: fromHeader,
    fromEmail: email,
    fromName: name,
    subject,
    body: content,
    snippet: message.snippet ?? content.slice(0, 200),
  };
}
