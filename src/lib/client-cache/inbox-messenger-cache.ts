import { createSessionCache } from "@/lib/client-cache/session-cache";
import type { InboxDetailsPanelData } from "@/services/inbox-details.service";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type {
  ConversationDetail,
  ConversationListItem,
} from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";

const MEDIA_URL_TTL_MS = 50 * 60 * 1000;
const CRM_DETAILS_TTL_MS = 10 * 60 * 1000;
const CONVERSATION_DETAIL_TTL_MS = 15 * 60 * 1000;
const CONVERSATION_LIST_TTL_MS = 5 * 60 * 1000;

export type CachedConversationDetail = {
  conversation: ConversationDetail;
  channelConnected: boolean;
  aiEnabled: boolean | null;
  cannedResponses: CannedResponseItem[];
};

export type CachedConversationList = {
  items: ConversationListItem[];
  totalCount?: number;
  hasMore?: boolean;
};

const mediaUrlCache = createSessionCache<string>(MEDIA_URL_TTL_MS);
const crmDetailsCache = createSessionCache<InboxDetailsPanelData>(
  CRM_DETAILS_TTL_MS,
);
const conversationDetailCache = createSessionCache<CachedConversationDetail>(
  CONVERSATION_DETAIL_TTL_MS,
);
const conversationListCache = createSessionCache<CachedConversationList>(
  CONVERSATION_LIST_TTL_MS,
);

/** Client media URL cache: in-memory signed URLs + IndexedDB blobs (survives reload). */
export function getCachedMediaUrl(key: string): string | null {
  return mediaUrlCache.get(key);
}

export function resolveCachedMediaUrl(
  keys: Array<string | null | undefined>,
): string | null {
  for (const key of keys) {
    if (!key) {
      continue;
    }

    const cached = mediaUrlCache.get(key);

    if (cached) {
      return cached;
    }
  }

  return null;
}

export function setCachedMediaUrl(key: string, url: string): void {
  mediaUrlCache.set(key, url);
}

export function getCachedCrmDetails(
  conversationId: string,
): InboxDetailsPanelData | null {
  return crmDetailsCache.get(conversationId);
}

export function peekCachedCrmDetails(
  conversationId: string,
): InboxDetailsPanelData | null {
  return crmDetailsCache.peek(conversationId);
}

export function setCachedCrmDetails(
  conversationId: string,
  data: InboxDetailsPanelData,
): void {
  crmDetailsCache.set(conversationId, data);
}

export function isCrmDetailsFresh(conversationId: string): boolean {
  return crmDetailsCache.isFresh(conversationId);
}

export function getCachedConversationDetail(
  conversationId: string,
): CachedConversationDetail | null {
  return conversationDetailCache.get(conversationId);
}

export function peekCachedConversationDetail(
  conversationId: string,
): CachedConversationDetail | null {
  return conversationDetailCache.peek(conversationId);
}

export function setCachedConversationDetail(
  conversationId: string,
  data: CachedConversationDetail,
): void {
  conversationDetailCache.set(conversationId, data);
}

export function isConversationDetailFresh(conversationId: string): boolean {
  return conversationDetailCache.isFresh(conversationId);
}

function getListCacheKey(input: {
  scope: "monitor" | "channel" | "favorites";
  channel?: MessagingChannel;
}): string {
  if (input.scope === "channel" && input.channel) {
    return `channel:${input.channel}`;
  }

  if (input.scope === "favorites") {
    return "favorites";
  }

  return "monitor";
}

export function getCachedConversationList(input: {
  scope: "monitor" | "channel" | "favorites";
  channel?: MessagingChannel;
}): CachedConversationList | null {
  return conversationListCache.get(getListCacheKey(input));
}

export function setCachedConversationList(
  input: {
    scope: "monitor" | "channel" | "favorites";
    channel?: MessagingChannel;
  },
  data: CachedConversationList,
): void {
  conversationListCache.set(getListCacheKey(input), data);
}
