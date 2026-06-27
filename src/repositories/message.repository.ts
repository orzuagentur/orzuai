import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  MessageSenderType,
  MessagingChannel,
} from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

export type ChannelMessageRow = Pick<
  Database["public"]["Tables"]["messages"]["Row"],
  | "id"
  | "conversation_id"
  | "channel"
  | "sender_type"
  | "content"
  | "email_subject"
  | "ai_generated"
  | "created_at"
  | "sent_at"
  | "external_message_id"
>;

export type ChannelMessageInsert = {
  conversationId: string;
  channel: MessagingChannel;
  senderType: MessageSenderType;
  content: string;
  emailSubject?: string | null;
  aiGenerated?: boolean;
  externalMessageId?: string | null;
};

export const CHAT_MESSAGE_SELECT =
  "id, conversation_id, channel, sender_type, content, email_subject, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at, sent_at";

export type ChatMessageRow = Pick<
  Database["public"]["Tables"]["messages"]["Row"],
  | "id"
  | "conversation_id"
  | "channel"
  | "sender_type"
  | "content"
  | "email_subject"
  | "ai_generated"
  | "deleted_for_all_at"
  | "hidden_for_business"
  | "edited_at"
  | "is_edited"
  | "created_at"
  | "sent_at"
>;

const CHANNEL_MESSAGE_SELECT =
  "id, conversation_id, channel, sender_type, content, email_subject, ai_generated, created_at, sent_at, external_message_id";

export class MessageRepository {
  constructor(private readonly db: DbClient) {}

  static forClient(db: DbClient): MessageRepository {
    return new MessageRepository(db);
  }

  static create(): MessageRepository {
    return new MessageRepository(createAdminClient());
  }

  async findByExternalId(
    channel: MessagingChannel,
    externalMessageId: string,
  ): Promise<ChannelMessageRow | null> {
    const { data, error } = await this.db
      .from("messages")
      .select(CHANNEL_MESSAGE_SELECT)
      .eq("channel", channel)
      .eq("external_message_id", externalMessageId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async insert(input: ChannelMessageInsert): Promise<ChannelMessageRow> {
    const { data, error } = await this.db
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        channel: input.channel,
        sender_type: input.senderType,
        content: input.content,
        email_subject: input.emailSubject?.trim() || null,
        ai_generated: input.aiGenerated ?? false,
        external_message_id: input.externalMessageId ?? null,
      })
      .select(CHANNEL_MESSAGE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateContent(messageId: string, content: string): Promise<void> {
    const { error } = await this.db
      .from("messages")
      .update({ content })
      .eq("id", messageId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async setHiddenForBusiness(
    messageId: string,
    hidden: boolean = true,
  ): Promise<void> {
    const { error } = await this.db
      .from("messages")
      .update({ hidden_for_business: hidden })
      .eq("id", messageId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async findConversationId(messageId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("conversation_id")
      .eq("id", messageId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.conversation_id ?? null;
  }

  async listForAiHistory(
    conversationId: string,
    limit: number,
  ): Promise<
    Array<{ id: string; sender_type: MessageSenderType; content: string }>
  > {
    const { data, error } = await this.db
      .from("messages")
      .select("id, sender_type, content")
      .eq("conversation_id", conversationId)
      .eq("hidden_for_business", false)
      .is("deleted_for_all_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async findLatestVisibleMessage(conversationId: string): Promise<{
    content: string;
    sent_at: string;
    sender_type: MessageSenderType;
    ai_generated: boolean;
  } | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("content, sent_at, sender_type, ai_generated")
      .eq("conversation_id", conversationId)
      .eq("hidden_for_business", false)
      .is("deleted_for_all_at", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findLatestClientMessageSentAt(
    conversationId: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("sent_at")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "client")
      .eq("hidden_for_business", false)
      .is("deleted_for_all_at", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.sent_at ?? null;
  }

  async findLatestAiMessage(
    conversationId: string,
  ): Promise<{ content: string; created_at: string } | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("content, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "ai")
      .eq("hidden_for_business", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listChatMessages(input: {
    conversationId: string;
    limit?: number;
    beforeSentAt?: string;
    afterSentAt?: string;
    afterMessageId?: string;
    order?: "asc" | "desc";
  }): Promise<ChatMessageRow[]> {
    let query = this.db
      .from("messages")
      .select(CHAT_MESSAGE_SELECT)
      .eq("conversation_id", input.conversationId)
      .eq("hidden_for_business", false);

    if (input.beforeSentAt) {
      query = query.lt("sent_at", input.beforeSentAt);
    }

    if (input.afterSentAt && input.afterMessageId) {
      query = query.or(
        `sent_at.gt.${input.afterSentAt},and(sent_at.eq.${input.afterSentAt},id.gt.${input.afterMessageId})`,
      );
    } else if (input.afterSentAt) {
      query = query.gt("sent_at", input.afterSentAt);
    }

    const orderAsc = input.order === "asc";
    query = query.order("sent_at", { ascending: orderAsc });

    if (input.limit) {
      query = query.limit(input.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async findLatestChatMessage(
    conversationId: string,
  ): Promise<ChatMessageRow | null> {
    const { data, error } = await this.db
      .from("messages")
      .select(CHAT_MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listMessagesForSummary(
    conversationId: string,
    limit = 30,
  ): Promise<Array<{ sender_type: MessageSenderType; content: string }>> {
    const { data, error } = await this.db
      .from("messages")
      .select("sender_type, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}

export function getMessageRepository(db?: DbClient): MessageRepository {
  return db ? MessageRepository.forClient(db) : MessageRepository.create();
}
