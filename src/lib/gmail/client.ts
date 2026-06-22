import "server-only";

import { parseGmailApiMessage, type ParsedGmailMessage } from "@/lib/gmail/message-parser";

type GmailListResponse = {
  messages?: Array<{ id?: string; threadId?: string }>;
  nextPageToken?: string;
};

type GmailHistoryResponse = {
  history?: Array<{
    messagesAdded?: Array<{ message?: { id?: string } }>;
  }>;
  historyId?: string;
};

type GmailProfileResponse = {
  emailAddress?: string;
  historyId?: string;
};

type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
};

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function fetchGmailProfile(
  accessToken: string,
): Promise<{ emailAddress: string; historyId: string } | null> {
  const data = await gmailFetch<GmailProfileResponse>(
    accessToken,
    "/users/me/profile",
  );

  if (!data?.emailAddress || !data.historyId) {
    return null;
  }

  return {
    emailAddress: data.emailAddress,
    historyId: data.historyId,
  };
}

export async function listRecentInboxMessageIds(
  accessToken: string,
  maxResults = 25,
): Promise<string[]> {
  const params = new URLSearchParams({
    labelIds: "INBOX",
    maxResults: String(maxResults),
    q: "newer_than:7d",
  });

  const data = await gmailFetch<GmailListResponse>(
    accessToken,
    `/users/me/messages?${params.toString()}`,
  );

  return (data?.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id));
}

export async function listHistoryMessageIds(
  accessToken: string,
  startHistoryId: string,
): Promise<{ messageIds: string[]; historyId: string | null }> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });

  const data = await gmailFetch<GmailHistoryResponse>(
    accessToken,
    `/users/me/history?${params.toString()}`,
  );

  const messageIds = new Set<string>();

  for (const entry of data?.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      if (added.message?.id) {
        messageIds.add(added.message.id);
      }
    }
  }

  return {
    messageIds: [...messageIds],
    historyId: data?.historyId ?? null,
  };
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<ParsedGmailMessage | null> {
  const data = await gmailFetch<GmailMessageResponse>(
    accessToken,
    `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
  );

  if (!data) {
    return null;
  }

  return parseGmailApiMessage(data as Parameters<typeof parseGmailApiMessage>[0]);
}

export async function sendGmailMessage(input: {
  accessToken: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const raw = [
    `From: ${input.fromEmail}`,
    `To: ${input.toEmail}`,
    `Subject: ${input.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    input.body,
  ].join("\r\n");

  const encoded = Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    },
  );

  const data = (await response.json()) as { id?: string; error?: { message?: string } };

  if (!response.ok) {
    return {
      success: false,
      error: data.error?.message ?? "Gmail send failed.",
    };
  }

  return { success: true, messageId: data.id };
}
