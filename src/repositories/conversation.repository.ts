import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ConversationStatus,
  Database,
  MessagingChannel,
} from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

const OPEN_CONVERSATION_STATUSES: ConversationStatus[] = [
  "open",
  "pending",
  "active",
];

export type ConversationMemorySnapshot = {
  aiSummary: string | null;
  aiSummaryUpdatedAt: string | null;
  aiSummaryMessageCount: number;
  totalMessageCount: number;
};

export type InboxConversationDetailRow = {
  id: string;
  channel: MessagingChannel;
  status: ConversationStatus;
  internal_note: string | null;
  updated_at: string;
  last_read_at: string | null;
  total_message_count: number | null;
  contact: {
    id: string;
    name: string;
    phone_number: string;
    is_favorite: boolean;
    avatar_url: string | null;
  } | null;
};

export type OutboundConversationRow = {
  id: string;
  channel: MessagingChannel;
  contact: {
    id: string;
    phone_number: string;
  } | null;
};

export class ConversationRepository {
  constructor(private readonly db: DbClient) {}

  static forClient(db: DbClient): ConversationRepository {
    return new ConversationRepository(db);
  }

  static create(): ConversationRepository {
    return new ConversationRepository(createAdminClient());
  }

  async findOpenForContact(
    businessId: string,
    contactId: string,
    channel: MessagingChannel,
  ): Promise<{ id: string } | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("contact_id", contactId)
      .eq("channel", channel)
      .in("status", OPEN_CONVERSATION_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findLatestForContact(
    businessId: string,
    contactId: string,
    channel: MessagingChannel,
  ): Promise<{ id: string } | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("contact_id", contactId)
      .eq("channel", channel)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async reopen(conversationId: string, updatedAt: string): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update({ status: "open", updated_at: updatedAt })
      .eq("id", conversationId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async create(input: {
    businessId: string;
    contactId: string;
    channel: MessagingChannel;
    status?: ConversationStatus;
  }): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from("conversations")
      .insert({
        business_id: input.businessId,
        channel: input.channel,
        contact_id: input.contactId,
        status: input.status ?? "open",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create conversation.");
    }

    return data;
  }

  async resolveForInboundContact(
    businessId: string,
    contactId: string,
    channel: MessagingChannel,
  ): Promise<string | null> {
    const now = new Date().toISOString();
    const openConversation = await this.findOpenForContact(
      businessId,
      contactId,
      channel,
    );

    if (openConversation?.id) {
      return openConversation.id;
    }

    const latestConversation = await this.findLatestForContact(
      businessId,
      contactId,
      channel,
    );

    if (latestConversation?.id) {
      await this.reopen(latestConversation.id, now);
      return latestConversation.id;
    }

    const created = await this.create({
      businessId,
      contactId,
      channel,
      status: "open",
    });

    return created.id;
  }

  async findContactId(
    conversationId: string,
    businessId: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("contact_id")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.contact_id ?? null;
  }

  async findLastClientMessageAt(
    conversationId: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("last_client_message_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.last_client_message_at ?? null;
  }

  async updateLastMessageFields(
    conversationId: string,
    patch: Database["public"]["Tables"]["conversations"]["Update"],
  ): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update(patch)
      .eq("id", conversationId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async findContactIdByPhone(
    businessId: string,
    phoneNumber: string,
  ): Promise<string | null> {
    const normalized = phoneNumber.trim();

    if (!normalized) {
      return null;
    }

    const { data, error } = await this.db
      .from("contacts")
      .select("id")
      .eq("business_id", businessId)
      .eq("phone_number", normalized)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      return data.id;
    }

    const withoutPlus = normalized.startsWith("+")
      ? normalized.slice(1)
      : normalized;

    const { data: alternate } = await this.db
      .from("contacts")
      .select("id")
      .eq("business_id", businessId)
      .in("phone_number", [`+${withoutPlus}`, withoutPlus])
      .limit(1)
      .maybeSingle();

    return alternate?.id ?? null;
  }

  async loadMemory(
    conversationId: string,
    businessId: string,
  ): Promise<ConversationMemorySnapshot | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select(
        "ai_summary, ai_summary_updated_at, ai_summary_message_count, total_message_count",
      )
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      aiSummary: data.ai_summary,
      aiSummaryUpdatedAt: data.ai_summary_updated_at,
      aiSummaryMessageCount: data.ai_summary_message_count ?? 0,
      totalMessageCount: data.total_message_count ?? 0,
    };
  }

  async updateMemorySummary(
    conversationId: string,
    businessId: string,
    input: {
      aiSummary: string;
      aiSummaryUpdatedAt: string;
      aiSummaryMessageCount: number;
    },
  ): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update({
        ai_summary: input.aiSummary,
        ai_summary_updated_at: input.aiSummaryUpdatedAt,
        ai_summary_message_count: input.aiSummaryMessageCount,
      })
      .eq("id", conversationId)
      .eq("business_id", businessId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async assertOwnedByBusiness(
    conversationId: string,
    businessId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findOwnedInboxDetail(
    conversationId: string,
    businessId: string,
  ): Promise<InboxConversationDetailRow | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select(
        "id, channel, status, internal_note, updated_at, last_read_at, total_message_count, contact:contacts(id, name, phone_number, is_favorite, avatar_url)",
      )
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as InboxConversationDetailRow | null;
  }

  async findOwnedForOutbound(
    conversationId: string,
    businessId: string,
  ): Promise<OutboundConversationRow | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("id, channel, contact:contacts(id, phone_number)")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as OutboundConversationRow | null;
  }

  async updateStatus(
    conversationId: string,
    businessId: string,
    status: ConversationStatus,
  ): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update({ status })
      .eq("id", conversationId)
      .eq("business_id", businessId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async setInternalNote(
    conversationId: string,
    businessId: string,
    internalNote: string | null,
  ): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update({ internal_note: internalNote })
      .eq("id", conversationId)
      .eq("business_id", businessId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async touchUpdatedAt(conversationId: string, updatedAt?: string): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .update({ updated_at: updatedAt ?? new Date().toISOString() })
      .eq("id", conversationId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getInternalNote(
    conversationId: string,
    businessId: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("internal_note")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.internal_note ?? null;
  }

  async appendInternalNote(input: {
    conversationId: string;
    businessId: string;
    noteLine: string;
    maxLength?: number;
  }): Promise<void> {
    const existing = await this.getInternalNote(
      input.conversationId,
      input.businessId,
    );
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const line = `[${timestamp}] ${input.noteLine.trim()}`;
    const trimmedExisting = existing?.trim() ?? "";
    const nextNote = trimmedExisting ? `${trimmedExisting}\n\n${line}` : line;

    const { error } = await this.db
      .from("conversations")
      .update({
        internal_note: nextNote.slice(0, input.maxLength ?? 8000),
      })
      .eq("id", input.conversationId)
      .eq("business_id", input.businessId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async countByBusinessAndChannel(
    businessId: string,
    channel: MessagingChannel,
  ): Promise<number> {
    const { count, error } = await this.db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("channel", channel);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async findLatestUpdatedAt(
    businessId: string,
    channel: MessagingChannel,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("updated_at")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.updated_at ?? null;
  }
}

export function getConversationRepository(
  db?: DbClient,
): ConversationRepository {
  return db
    ? ConversationRepository.forClient(db)
    : ConversationRepository.create();
}
