import type {
  ConversationGapSyncPayload,
  ConversationReconnectCursor,
} from "@/lib/realtime/conversation-channel";

type GapSyncResponse =
  | ({ success: true } & ConversationGapSyncPayload)
  | { success: false; error?: string };

const GAP_SYNC_MAX_ATTEMPTS = 3;
const GAP_SYNC_RETRY_BASE_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function requestConversationGapSync(
  conversationId: string,
  cursor: ConversationReconnectCursor,
): Promise<GapSyncResponse> {
  try {
    const response = await fetch(
      `/api/conversations/${conversationId}/gap-sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afterCreatedAt: cursor.afterCreatedAt,
          afterMessageId: cursor.afterMessageId,
        }),
        cache: "no-store",
      },
    );

    const payload = (await response.json()) as GapSyncResponse & {
      error?: string;
    };

    if (!response.ok || !("success" in payload) || !payload.success) {
      return {
        success: false,
        error: payload.error ?? "Gap sync failed.",
      };
    }

    return payload;
  } catch {
    return { success: false, error: "Gap sync failed." };
  }
}

export async function requestConversationGapSyncWithRetry(
  conversationId: string,
  cursor: ConversationReconnectCursor,
): Promise<GapSyncResponse> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= GAP_SYNC_MAX_ATTEMPTS; attempt += 1) {
    const result = await requestConversationGapSync(conversationId, cursor);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    if (attempt < GAP_SYNC_MAX_ATTEMPTS) {
      await delay(GAP_SYNC_RETRY_BASE_MS * attempt);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[gap-sync] failed after ${GAP_SYNC_MAX_ATTEMPTS} attempts for ${conversationId}`,
      lastError,
    );
  }

  return { success: false, error: lastError ?? "Gap sync failed." };
}
