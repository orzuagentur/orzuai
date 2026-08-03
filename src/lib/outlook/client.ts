import "server-only";

export type ParsedOutlookMessage = {
  id: string;
  subject: string;
  body: string;
  snippet: string;
  fromEmail: string;
  fromName: string | null;
  sentAt: string | null;
  isAutomated: boolean;
};

type GraphError = {
  status: number;
  message: string;
};

type GraphFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GraphError };

type GraphMessage = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: {
    emailAddress?: { name?: string; address?: string };
  };
  receivedDateTime?: string;
  internetMessageId?: string;
};

type GraphMessageList = {
  value?: GraphMessage[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

async function graphFetch<T>(
  accessToken: string,
  pathOrUrl: string,
  init?: RequestInit,
): Promise<GraphFetchResult<T>> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `https://graph.microsoft.com/v1.0${pathOrUrl}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"',
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
        message:
          body?.error?.message ??
          `Microsoft Graph request failed (${response.status}).`,
      },
    };
  }

  if (response.status === 204) {
    return { ok: true, data: {} as T };
  }

  return { ok: true, data: (await response.json()) as T };
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function looksAutomated(fromEmail: string, subject: string): boolean {
  const email = fromEmail.toLowerCase();
  const subj = subject.toLowerCase();
  return (
    email.startsWith("noreply@") ||
    email.startsWith("no-reply@") ||
    email.startsWith("mailer-daemon@") ||
    email.includes("notifications@") ||
    subj.includes("unsubscribe") ||
    subj.startsWith("delivery status")
  );
}

export function parseOutlookGraphMessage(
  message: GraphMessage,
): ParsedOutlookMessage | null {
  const id = message.id?.trim();
  const fromEmail = message.from?.emailAddress?.address?.trim().toLowerCase();

  if (!id || !fromEmail || !fromEmail.includes("@")) {
    return null;
  }

  const subject = message.subject?.trim() || "(no subject)";
  const rawBody = message.body?.content?.trim() || "";
  const body =
    message.body?.contentType?.toLowerCase() === "html"
      ? stripHtml(rawBody)
      : rawBody || message.bodyPreview?.trim() || subject;

  return {
    id,
    subject,
    body,
    snippet: message.bodyPreview?.trim() || body.slice(0, 160),
    fromEmail,
    fromName: message.from?.emailAddress?.name?.trim() || null,
    sentAt: message.receivedDateTime ?? null,
    isAutomated: looksAutomated(fromEmail, subject),
  };
}

export async function listRecentOutlookInboxMessages(
  accessToken: string,
  options: { top?: number } = {},
): Promise<{
  messages: ParsedOutlookMessage[];
  deltaLink: string | null;
  error?: GraphError;
}> {
  const top = options.top ?? 40;
  const path =
    `/me/mailFolders/inbox/messages?$top=${top}` +
    "&$orderby=receivedDateTime desc" +
    "&$select=id,subject,bodyPreview,body,from,receivedDateTime,internetMessageId";

  const result = await graphFetch<GraphMessageList>(accessToken, path);

  if (!result.ok) {
    return { messages: [], deltaLink: null, error: result.error };
  }

  const messages = (result.data.value ?? [])
    .map((item) => parseOutlookGraphMessage(item))
    .filter((item): item is ParsedOutlookMessage => Boolean(item));

  return { messages, deltaLink: result.data["@odata.deltaLink"] ?? null };
}

export async function syncOutlookInboxDelta(
  accessToken: string,
  deltaLink: string | null,
): Promise<{
  messages: ParsedOutlookMessage[];
  deltaLink: string | null;
  error?: GraphError;
}> {
  if (!deltaLink) {
    // First delta bootstrap.
    const path =
      "/me/mailFolders/inbox/messages/delta?$select=id,subject,bodyPreview,body,from,receivedDateTime,internetMessageId";
    let nextUrl: string | null =
      `https://graph.microsoft.com/v1.0${path}`;
    const collected: ParsedOutlookMessage[] = [];
    let finalDelta: string | null = null;

    while (nextUrl) {
      const page: GraphFetchResult<GraphMessageList> = await graphFetch<GraphMessageList>(
        accessToken,
        nextUrl,
      );
      if (!page.ok) {
        return { messages: collected, deltaLink: finalDelta, error: page.error };
      }

      for (const item of page.data.value ?? []) {
        const parsed = parseOutlookGraphMessage(item);
        if (parsed) {
          collected.push(parsed);
        }
      }

      nextUrl = page.data["@odata.nextLink"] ?? null;
      finalDelta = page.data["@odata.deltaLink"] ?? finalDelta;
    }

    return { messages: collected, deltaLink: finalDelta };
  }

  let nextUrl: string | null = deltaLink;
  const collected: ParsedOutlookMessage[] = [];
  let finalDelta: string | null = deltaLink;

  while (nextUrl) {
    const page: GraphFetchResult<GraphMessageList> = await graphFetch<GraphMessageList>(
      accessToken,
      nextUrl,
    );
    if (!page.ok) {
      // Delta link expired — caller should reset.
      return { messages: collected, deltaLink: null, error: page.error };
    }

    for (const item of page.data.value ?? []) {
      const parsed = parseOutlookGraphMessage(item);
      if (parsed) {
        collected.push(parsed);
      }
    }

    nextUrl = page.data["@odata.nextLink"] ?? null;
    finalDelta = page.data["@odata.deltaLink"] ?? finalDelta;
  }

  return { messages: collected, deltaLink: finalDelta };
}

export async function sendOutlookMessage(input: {
  accessToken: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const result = await graphFetch<{ id?: string }>(
    input.accessToken,
    "/me/sendMail",
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: {
            contentType: "Text",
            content: input.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: input.toEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    },
  );

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  // sendMail returns 202/204 with empty body; use opaque marker for delivery log.
  return { success: true, messageId: `outlook:${Date.now()}` };
}
