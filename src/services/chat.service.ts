import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  ChatsPageData,
  ConversationDetail,
  ConversationListItem,
  SendChatMessageResult,
  ToggleChatAiResult,
} from "@/types/chat.types";
import {
  sendChatMessageSchema,
  toggleChatAiSchema,
} from "@/types/chat.types";
import {
  buildLastMessagePreviewMap,
  mapChatMessage,
  mapConversationListItem,
  resolveContactFromRow,
} from "@/utils/chat";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: CHAT_MESSAGES.missingConfig,
    },
  };
}

function revalidateChatPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(APP_ROUTES.dashboard);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function incrementMessageAnalytics(
  businessId: string,
  totalMessages = 1,
): Promise<void> {
  const supabase = await createClient();
  const { data: analytics } = await supabase
    .from("analytics")
    .select("total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId)
    .maybeSingle();

  await supabase.from("analytics").upsert(
    {
      business_id: businessId,
      total_messages: (analytics?.total_messages ?? 0) + totalMessages,
      total_contacts: analytics?.total_contacts ?? 0,
      ai_replies: analytics?.ai_replies ?? 0,
    },
    { onConflict: "business_id" },
  );
}

export async function listConversations(
  businessId: string,
): Promise<ConversationListItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, status, updated_at, contact:contacts(name, phone_number)",
    )
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (!conversations?.length) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastMessageMap = buildLastMessagePreviewMap(messages ?? []);

  return conversations.flatMap((conversation) => {
    const item = mapConversationListItem(
      conversation,
      lastMessageMap.get(conversation.id),
    );

    return item ? [item] : [];
  });
}

export async function getConversationDetail(
  conversationId: string,
  businessId: string,
): Promise<ConversationDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, status, updated_at, contact:contacts(name, phone_number)",
    )
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return null;
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return null;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_type, content, ai_generated, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return {
    id: conversation.id,
    contactName: contact.name ?? contact.phone_number,
    contactPhone: contact.phone_number,
    status: conversation.status,
    updatedAt: conversation.updated_at,
    messages: (messages ?? []).map(mapChatMessage),
  };
}

async function isWhatsAppConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("whatsapp_status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.whatsapp_status === "connected";
}

async function getAiEnabled(businessId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return data.ai_enabled;
}

export async function getChatsPageData(
  activeConversationId?: string,
): Promise<ChatsPageData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      whatsappConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      hasBusiness: false,
      whatsappConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
    };
  }

  const [conversations, whatsappConnected, aiEnabled] = await Promise.all([
    listConversations(business.id),
    isWhatsAppConnected(business.id),
    getAiEnabled(business.id),
  ]);

  const selectedId =
    activeConversationId &&
    conversations.some((conversation) => conversation.id === activeConversationId)
      ? activeConversationId
      : (conversations[0]?.id ?? null);

  const activeConversation = selectedId
    ? await getConversationDetail(selectedId, business.id)
    : null;

  return {
    hasBusiness: true,
    whatsappConnected,
    aiEnabled,
    conversations,
    activeConversation,
  };
}

export async function sendChatMessage(
  input: unknown,
): Promise<SendChatMessageResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = sendChatMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const connected = await isWhatsAppConnected(businessId);

  if (!connected) {
    return {
      success: false,
      error: {
        code: "WHATSAPP_NOT_CONNECTED",
        message: CHAT_MESSAGES.whatsappNotConnected,
      },
    };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact:contacts(id, phone_number)")
    .eq("id", parsed.data.conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("meta_phone_number_id, meta_access_token")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (
    !connection?.meta_phone_number_id ||
    !connection.meta_access_token
  ) {
    return {
      success: false,
      error: {
        code: "WHATSAPP_NOT_CONNECTED",
        message: CHAT_MESSAGES.whatsappNotConnected,
      },
    };
  }

  const sendResult = await sendWhatsAppTextMessage(
    connection.meta_phone_number_id,
    connection.meta_access_token,
    contact.phone_number.replace(/^\+/, ""),
    parsed.data.content,
  );

  if (!sendResult.success) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: sendResult.message,
      },
    };
  }

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_type: "user",
      content: parsed.data.content,
      ai_generated: false,
    })
    .select("id, conversation_id, sender_type, content, ai_generated, created_at")
    .single();

  if (error || !message) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.sendFailed,
      },
    };
  }

  const contactUpdates = contact.id
    ? [
        supabase
          .from("contacts")
          .update({ last_message_at: now })
          .eq("id", contact.id),
      ]
    : [];

  await Promise.all([
    supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", parsed.data.conversationId),
    ...contactUpdates,
    incrementMessageAnalytics(businessId),
  ]);

  revalidateChatPaths();

  return {
    success: true,
    data: {
      message: mapChatMessage(message),
    },
  };
}

export async function toggleChatAi(input: unknown): Promise<ToggleChatAiResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = toggleChatAiSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_settings")
    .update({ ai_enabled: parsed.data.enabled })
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CHAT_MESSAGES.aiToggleFailed,
      },
    };
  }

  revalidateChatPaths();

  return {
    success: true,
    data: {
      aiEnabled: parsed.data.enabled,
    },
  };
}
