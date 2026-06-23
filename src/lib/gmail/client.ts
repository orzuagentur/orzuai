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
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  };
};

export type GmailApiError = {
  status: number;
  message: string;
};

type GmailFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GmailApiError };

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<GmailFetchResult<T>> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    return {
      ok: false,
      error: {
        status: response.status,
        message: body?.error?.message ?? `Gmail API request failed (${response.status}).`,
      },
    };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function formatGmailApiError(error: GmailApiError): string {
  if (
    error.status === 403 &&
    error.message.toLowerCase().includes("gmail api has not been used")
  ) {
    return "Gmail API is disabled in Google Cloud. Enable Gmail API for your OAuth project, then try Sync now again.";
  }

  return error.message;
}

export async function fetchGmailProfile(
  accessToken: string,
): Promise<
  | { emailAddress: string; historyId: string }
  | { error: GmailApiError }
  | null
> {
  const result = await gmailFetch<GmailProfileResponse>(
    accessToken,
    "/users/me/profile",
  );

  if (!result.ok) {
    return { error: result.error };
  }

  const data = result.data;

  if (!data.emailAddress || !data.historyId) {
    return null;
  }

  return {
    emailAddress: data.emailAddress,
    historyId: data.historyId,
  };
}

export async function listRecentInboxMessageIds(
  accessToken: string,
  maxResults = 50,
): Promise<{ messageIds: string[]; error?: GmailApiError }> {
  const params = new URLSearchParams({
    labelIds: "INBOX",
    maxResults: String(maxResults),
    q: "newer_than:30d",
  });

  const result = await gmailFetch<GmailListResponse>(
    accessToken,
    `/users/me/messages?${params.toString()}`,
  );

  if (!result.ok) {
    return { messageIds: [], error: result.error };
  }

  return {
    messageIds: (result.data.messages ?? [])
      .map((message) => message.id)
      .filter((id): id is string => Boolean(id)),
  };
}

export async function listHistoryMessageIds(
  accessToken: string,
  startHistoryId: string,
): Promise<{
  messageIds: string[];
  historyId: string | null;
  error?: GmailApiError;
}> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });

  const result = await gmailFetch<GmailHistoryResponse>(
    accessToken,
    `/users/me/history?${params.toString()}`,
  );

  if (!result.ok) {
    return {
      messageIds: [],
      historyId: null,
      error: result.error,
    };
  }

  const data = result.data;
  const messageIds = new Set<string>();

  for (const entry of data.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      if (added.message?.id) {
        messageIds.add(added.message.id);
      }
    }
  }

  return {
    messageIds: [...messageIds],
    historyId: data.historyId ?? null,
  };
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<ParsedGmailMessage | null> {
  const result = await gmailFetch<GmailMessageResponse>(
    accessToken,
    `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
  );

  if (!result.ok) {
    return null;
  }

  return parseGmailApiMessage(
    result.data as Parameters<typeof parseGmailApiMessage>[0],
  );
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

type GmailWatchResponse = {
  historyId?: string;
  expiration?: string;
};

export async function watchGmailInbox(
  accessToken: string,
  topicName: string,
): Promise<
  | { historyId: string; expiration: string }
  | { error: GmailApiError }
> {
  const result = await gmailFetch<GmailWatchResponse>(
    accessToken,
    "/users/me/watch",
    {
      method: "POST",
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
      }),
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  const historyId = result.data.historyId;
  const expiration = result.data.expiration;

  if (!historyId || !expiration) {
    return {
      error: {
        status: 500,
        message: "Gmail watch response was incomplete.",
      },
    };
  }

  return { historyId, expiration };
}

export async function stopGmailWatch(
  accessToken: string,
): Promise<{ success: true } | { error: GmailApiError }> {
  const result = await gmailFetch<Record<string, never>>(
    accessToken,
    "/users/me/stop",
    { method: "POST" },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
