import type {
  ConversationGapSyncPayload,
  ConversationReconnectCursor,
} from "@/lib/realtime/conversation-channel";

type GapSyncResponse =
  | ({ success: true } & ConversationGapSyncPayload)
  | { success: false; error?: string };

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
