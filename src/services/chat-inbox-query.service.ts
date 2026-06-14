import "server-only";

import {
  INBOX_PAGE_SIZE,
  type ChatInboxFilter,
  type ChatInboxSort,
} from "@/features/chats/constants";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { resolveContactAvatarSignedUrls } from "@/services/contact-avatar-storage.service";
import type { ConversationListItem } from "@/types/chat.types";
import type { MessagingChannel as DbMessagingChannel } from "@/types/database.types";
import { mapConversationListItem, resolveContactFromRow } from "@/utils/chat";
import { resolveAvatarUrlFromMap } from "@/utils/contact-avatar";
import { phoneDigitsOnly } from "@/utils/whatsapp";

export type InboxQuickView = "all" | "needs_reply" | "high_intent" | "favorites";

export type ListConversationsPageInput = {
  channel?: DbMessagingChannel;
  limit?: number;
  offset?: number;
  search?: string;
  view?: InboxQuickView;
  filter?: ChatInboxFilter;
  sort?: ChatInboxSort;
  userId?: string;
};

export type ListConversationsPageResult = {
  items: ConversationListItem[];
  totalCount: number;
  hasMore: boolean;
};

type InboxRpcRow = {
  id: string;
  channel: ConversationListItem["channel"];
  status: ConversationListItem["status"];
  updated_at: string;
  last_read_at: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_type: ConversationListItem["lastMessageSenderType"];
  last_message_ai_generated: boolean;
  last_client_message_at: string | null;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_lead_score: number | null;
  contact_is_favorite: boolean;
  contact_avatar_url: string | null;
  total_count: number;
};

type RawConversationQueryRow = {
  id: string;
  channel: ConversationListItem["channel"];
  status: ConversationListItem["status"];
  updated_at: string;
  last_read_at: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_type: ConversationListItem["lastMessageSenderType"];
  last_message_ai_generated: boolean;
  last_client_message_at: string | null;
  contact:
    | {
        id: string;
        name: string;
        phone_number: string;
        lead_score?: number | null;
        is_favorite?: boolean | null;
        avatar_url?: string | null;
      }
    | null;
};

function mapInboxRpcRow(row: InboxRpcRow): RawConversationQueryRow {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    updated_at: row.updated_at,
    last_read_at: row.last_read_at,
    unread_count: row.unread_count,
    last_message_preview: row.last_message_preview,
    last_message_at: row.last_message_at,
    last_message_sender_type: row.last_message_sender_type,
    last_message_ai_generated: row.last_message_ai_generated,
    last_client_message_at: row.last_client_message_at,
    contact: {
      id: row.contact_id,
      name: row.contact_name,
      phone_number: row.contact_phone,
      lead_score: row.contact_lead_score,
      is_favorite: row.contact_is_favorite,
      avatar_url: row.contact_avatar_url,
    },
  };
}

async function mapConversationRows(
  rows: RawConversationQueryRow[],
): Promise<ConversationListItem[]> {
  if (!rows.length) {
    return [];
  }

  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls(
    rows.map((row) => resolveContactFromRow(row.contact)?.avatar_url),
  );

  return rows.flatMap((row) => {
    const contact = resolveContactFromRow(row.contact);
    const item = mapConversationListItem(
      row,
      undefined,
      undefined,
      row.unread_count ?? 0,
      resolveAvatarUrlFromMap(contact?.avatar_url, avatarSignedUrlMap),
    );
    return item ? [item] : [];
  });
}

function dedupeConversationsByContactPhone(
  items: ConversationListItem[],
): ConversationListItem[] {
  const latestByContact = new Map<string, ConversationListItem>();

  for (const item of items) {
    const key = `${item.channel}:${phoneDigitsOnly(item.contactPhone)}`;
    const existing = latestByContact.get(key);

    if (
      !existing ||
      new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
    ) {
      latestByContact.set(key, item);
    }
  }

  return Array.from(latestByContact.values());
}

async function queryInboxConversations(
  businessId: string,
  input: ListConversationsPageInput & { userId: string },
  fetchLimit: number,
): Promise<{ rows: InboxRpcRow[]; totalCount: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_inbox_conversations", {
    p_business_id: businessId,
    p_user_id: input.userId,
    p_channel: input.channel ?? undefined,
    p_search: input.search?.trim() || undefined,
    p_view: input.view ?? "all",
    p_filter: input.filter ?? "all",
    p_sort: input.sort ?? "latest",
    p_limit: fetchLimit,
    p_offset: input.offset ?? 0,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as InboxRpcRow[];
  const totalCount = rows[0]?.total_count ?? 0;

  return {
    rows,
    totalCount: Number(totalCount),
  };
}

export async function listConversationsPage(
  businessId: string,
  input: ListConversationsPageInput = {},
): Promise<ListConversationsPageResult> {
  if (!hasSupabaseEnv()) {
    return { items: [], totalCount: 0, hasMore: false };
  }

  const userId = input.userId ?? (await requireUser()).id;
  const limit = input.limit ?? INBOX_PAGE_SIZE;
  const offset = input.offset ?? 0;
  const fetchLimit = limit + 1;

  const { rows, totalCount } = await queryInboxConversations(
    businessId,
    {
      ...input,
      userId,
      offset,
    },
    fetchLimit,
  );

  if (!rows.length) {
    return { items: [], totalCount, hasMore: false };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  let items = await mapConversationRows(pageRows.map(mapInboxRpcRow));

  items = dedupeConversationsByContactPhone(items);

  return {
    items,
    totalCount,
    hasMore: hasMore || offset + items.length < totalCount,
  };
}

export async function getConversationListItem(
  businessId: string,
  conversationId: string,
): Promise<ConversationListItem | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const CONVERSATION_LIST_SELECT =
    "id, channel, status, updated_at, last_read_at, unread_count, last_message_preview, last_message_at, last_message_sender_type, last_message_ai_generated, last_client_message_at, contact:contacts(id, name, phone_number, lead_score, is_favorite, avatar_url)";

  const { data } = await supabase
    .from("conversations")
    .select(CONVERSATION_LIST_SELECT)
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const items = await mapConversationRows([data as RawConversationQueryRow]);
  return items[0] ?? null;
}
