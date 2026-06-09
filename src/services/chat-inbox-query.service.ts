import "server-only";

import {
  HIGH_INTENT_LEAD_SCORE,
  INBOX_PAGE_SIZE,
  type ChatInboxFilter,
  type ChatInboxSort,
} from "@/features/chats/constants";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { ConversationListItem } from "@/types/chat.types";
import type { MessagingChannel as DbMessagingChannel } from "@/types/database.types";
import {
  buildLastMessagePreviewMap,
  mapConversationListItem,
} from "@/utils/chat";
import { phoneDigitsOnly } from "@/utils/whatsapp";
import {
  isConversationNeedsAttention,
  sortConversations,
} from "@/utils/chat-inbox-priority";
import { filterConversations } from "@/utils/chat-inbox-filters";

export const NEEDS_REPLY_SCAN_LIMIT = 500;

export type InboxQuickView = "all" | "needs_reply" | "high_intent";

export type ListConversationsPageInput = {
  channel?: DbMessagingChannel;
  limit?: number;
  offset?: number;
  search?: string;
  view?: InboxQuickView;
  filter?: ChatInboxFilter;
  sort?: ChatInboxSort;
};

export type ListConversationsPageResult = {
  items: ConversationListItem[];
  totalCount: number;
  hasMore: boolean;
};

type RawConversationQueryRow = {
  id: string;
  channel: ConversationListItem["channel"];
  status: ConversationListItem["status"];
  updated_at: string;
  contact:
    | {
        name: string;
        phone_number: string;
        lead_score?: number | null;
      }
    | Array<{
        name: string;
        phone_number: string;
        lead_score?: number | null;
      }>
    | null;
};

async function findConversationIdsForSearch(
  businessId: string,
  search: string,
  channel?: DbMessagingChannel,
): Promise<string[]> {
  const term = search.trim();

  if (!term) {
    return [];
  }

  const supabase = await createClient();
  const pattern = `%${term}%`;
  const ids = new Set<string>();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .or(`name.ilike.${pattern},phone_number.ilike.${pattern}`);

  const contactIds = contacts?.map((contact) => contact.id) ?? [];

  if (contactIds.length > 0) {
    let contactQuery = supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .in("contact_id", contactIds);

    if (channel) {
      contactQuery = contactQuery.eq("channel", channel);
    }

    const { data: contactConversations } = await contactQuery;

    for (const conversation of contactConversations ?? []) {
      ids.add(conversation.id);
    }
  }

  let conversationScopeQuery = supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId);

  if (channel) {
    conversationScopeQuery = conversationScopeQuery.eq("channel", channel);
  }

  const { data: scopedConversations } = await conversationScopeQuery.limit(500);
  const scopedIds = scopedConversations?.map((conversation) => conversation.id) ?? [];

  if (scopedIds.length > 0) {
    const { data: messageMatches } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", scopedIds)
      .ilike("content", pattern)
      .limit(100);

    for (const message of messageMatches ?? []) {
      ids.add(message.conversation_id);
    }
  }

  return [...ids];
}

async function findHighIntentContactIds(businessId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .gte("lead_score", HIGH_INTENT_LEAD_SCORE);

  return contacts?.map((contact) => contact.id) ?? [];
}

async function mapConversationRows(
  rows: RawConversationQueryRow[],
): Promise<ConversationListItem[]> {
  if (!rows.length) {
    return [];
  }

  const supabase = await createClient();
  const conversationIds = rows.map((row) => row.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, sender_type, ai_generated")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastMessageMap = buildLastMessagePreviewMap(messages ?? []);

  return rows.flatMap((row) => {
    const item = mapConversationListItem(row, lastMessageMap.get(row.id));
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

async function fetchConversationRows(
  businessId: string,
  {
    channel,
    conversationIds,
    contactIds,
    offset,
    limit,
  }: {
    channel?: DbMessagingChannel;
    conversationIds?: string[];
    contactIds?: string[];
    offset: number;
    limit: number;
  },
): Promise<{ rows: RawConversationQueryRow[]; count: number | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("conversations")
    .select(
      "id, channel, status, updated_at, contact:contacts(name, phone_number, lead_score)",
      { count: "exact" },
    )
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (channel) {
    query = query.eq("channel", channel);
  }

  if (conversationIds) {
    if (!conversationIds.length) {
      return { rows: [], count: 0 };
    }

    query = query.in("id", conversationIds);
  }

  if (contactIds) {
    if (!contactIds.length) {
      return { rows: [], count: 0 };
    }

    query = query.in("contact_id", contactIds);
  }

  const { data, count } = await query.range(offset, offset + limit - 1);

  return {
    rows: (data ?? []) as RawConversationQueryRow[],
    count,
  };
}

async function listNeedsReplyConversationsPage(
  businessId: string,
  input: ListConversationsPageInput,
): Promise<ListConversationsPageResult> {
  const limit = input.limit ?? INBOX_PAGE_SIZE;
  let skip = input.offset ?? 0;
  const collected: ConversationListItem[] = [];
  let scanned = 0;
  let batchOffset = 0;
  const batchSize = 50;

  while (collected.length < limit && scanned < NEEDS_REPLY_SCAN_LIMIT) {
    const { rows } = await fetchConversationRows(businessId, {
      channel: input.channel,
      offset: batchOffset,
      limit: batchSize,
    });

    if (!rows.length) {
      break;
    }

    scanned += rows.length;
    batchOffset += batchSize;

    const mapped = await mapConversationRows(rows);

    for (const item of mapped) {
      if (!isConversationNeedsAttention(item)) {
        continue;
      }

      if (skip > 0) {
        skip -= 1;
        continue;
      }

      collected.push(item);

      if (collected.length >= limit) {
        break;
      }
    }
  }

  const items = dedupeConversationsByContactPhone(
    sortConversations(
      filterConversations(collected, {
        searchQuery: "",
        filter: input.filter ?? "all",
      }),
      input.sort ?? "latest",
    ),
  );

  return {
    items,
    totalCount: items.length,
    hasMore: scanned >= batchSize && collected.length >= limit,
  };
}

export async function listConversationsPage(
  businessId: string,
  input: ListConversationsPageInput = {},
): Promise<ListConversationsPageResult> {
  if (!hasSupabaseEnv()) {
    return { items: [], totalCount: 0, hasMore: false };
  }

  const limit = input.limit ?? INBOX_PAGE_SIZE;
  const offset = input.offset ?? 0;
  const view = input.view ?? "all";
  const search = input.search?.trim() ?? "";

  if (view === "needs_reply" && !search) {
    return listNeedsReplyConversationsPage(businessId, input);
  }

  let conversationIds: string[] | undefined;
  let contactIds: string[] | undefined;

  if (search) {
    conversationIds = await findConversationIdsForSearch(
      businessId,
      search,
      input.channel,
    );

    if (!conversationIds.length) {
      return { items: [], totalCount: 0, hasMore: false };
    }
  } else if (view === "high_intent") {
    contactIds = await findHighIntentContactIds(businessId);

    if (!contactIds.length) {
      return { items: [], totalCount: 0, hasMore: false };
    }
  }

  const { rows } = await fetchConversationRows(businessId, {
    channel: input.channel,
    conversationIds,
    contactIds,
    offset,
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  let items = await mapConversationRows(pageRows);

  items = dedupeConversationsByContactPhone(items);

  items = sortConversations(
    filterConversations(items, {
      searchQuery: search,
      filter: input.filter ?? "all",
    }),
    input.sort ?? "latest",
  );

  return {
    items,
    totalCount: items.length,
    hasMore,
  };
}
