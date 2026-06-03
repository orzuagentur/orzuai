import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import {
  getInstagramEmbeddedSignupConfigId,
  getMetaAppId,
  hasInstagramEnv,
  hasSupabaseEnv,
} from "@/lib/env";
import {
  exchangeInstagramSignupCode,
  resolveInstagramPageDetails,
  sendInstagramTextMessage,
  subscribeInstagramPage,
} from "@/lib/instagram/client";
import { isEmbeddedSignupFinishEvent } from "@/lib/whatsapp/embedded-signup";
import { getWhatsAppApiVersion } from "@/lib/whatsapp/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
  processChannelAutoReply,
} from "@/services/messaging.service";
import type { InstagramConnection } from "@/types/database.types";
import type {
  CompleteInstagramEmbeddedSignupInput,
  CompleteInstagramEmbeddedSignupResult,
  InstagramConnectionData,
  InstagramEmbeddedSignupConfig,
  InstagramWebhookPayload,
} from "@/types/instagram.types";
import { completeInstagramEmbeddedSignupSchema } from "@/types/instagram.types";
import { mapInstagramConnection } from "@/utils/instagram";
import { parseInstagramWebhookPayload } from "@/utils/instagram-webhook";

function missingConfigError(): CompleteInstagramEmbeddedSignupResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: INSTAGRAM_MESSAGES.genericError,
    },
  };
}

function revalidateInstagramPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/instagram`);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getInstagramConnection(
  businessId: string,
): Promise<InstagramConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("instagram_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapInstagramConnection(data) : null;
}

export async function getInstagramEmbeddedSignupConfig(): Promise<InstagramEmbeddedSignupConfig> {
  const appId = getMetaAppId();
  const configId = getInstagramEmbeddedSignupConfigId();

  return {
    appId: appId ?? "",
    configId: configId ?? "",
    graphApiVersion: getWhatsAppApiVersion(),
    isConfigured: hasInstagramEnv(),
  };
}

export async function completeInstagramEmbeddedSignup(
  input: CompleteInstagramEmbeddedSignupInput,
): Promise<CompleteInstagramEmbeddedSignupResult> {
  if (!hasSupabaseEnv() || !hasInstagramEnv()) {
    return missingConfigError();
  }

  const parsed = completeInstagramEmbeddedSignupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  if (!isEmbeddedSignupFinishEvent(parsed.data.finishEvent)) {
    return {
      success: false,
      error: {
        code: "SIGNUP_INCOMPLETE",
        message: INSTAGRAM_MESSAGES.signupIncomplete,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: INSTAGRAM_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("instagram_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: INSTAGRAM_MESSAGES.alreadyConnected,
      },
    };
  }

  const tokenResult = await exchangeInstagramSignupCode(parsed.data.code);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: tokenResult.message,
      },
    };
  }

  const pageDetails = await resolveInstagramPageDetails(
    parsed.data.pageId,
    tokenResult.accessToken,
    parsed.data.igUserId,
  );

  if (!pageDetails.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: pageDetails.message,
      },
    };
  }

  const subscribeResult = await subscribeInstagramPage(
    pageDetails.details.pageId,
    tokenResult.accessToken,
  );

  if (!subscribeResult.success) {
    return {
      success: false,
      error: {
        code: "SUBSCRIBE_FAILED",
        message: subscribeResult.message,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const connectionPayload = {
    business_id: businessId,
    instagram_username: pageDetails.details.username || pageDetails.details.pageName,
    instagram_status: "connected" as const,
    meta_page_id: pageDetails.details.pageId,
    meta_ig_user_id: pageDetails.details.igUserId,
    meta_access_token: tokenResult.accessToken,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("instagram_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("instagram_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("instagram_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || INSTAGRAM_MESSAGES.genericError,
      },
    };
  }

  revalidateInstagramPaths();

  return {
    success: true,
    data: {
      connection: mapInstagramConnection(data),
    },
  };
}

async function ingestInstagramMessage(
  admin: ReturnType<typeof createAdminClient>,
  connection: InstagramConnection,
  message: {
    from: string;
    body: string;
    contactName: string;
  },
): Promise<void> {
  const businessId = connection.business_id;
  const identifier = `ig:${message.from}`;

  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("channel", "instagram")
    .eq("phone_number", identifier)
    .maybeSingle();

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        channel: "instagram",
        name: message.contactName,
        phone_number: identifier,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    contactId = createdContactRow?.id;
    createdContact = Boolean(contactId);
  } else {
    await admin
      .from("contacts")
      .update({
        name: message.contactName,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }

  if (!contactId) {
    return;
  }

  const { data: existingConversation } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("channel", "instagram")
    .eq("status", "active")
    .maybeSingle();

  let conversationId = existingConversation?.id;

  if (!conversationId) {
    const { data: createdConversation } = await admin
      .from("conversations")
      .insert({
        business_id: businessId,
        channel: "instagram",
        contact_id: contactId,
        status: "active",
      })
      .select("id")
      .single();

    conversationId = createdConversation?.id;
  }

  if (!conversationId) {
    return;
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "instagram",
    senderType: "client",
    content: message.body,
  });

  await incrementMessagingAnalytics(admin, businessId, "instagram", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("instagram_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  await processChannelAutoReply({
    admin,
    businessId,
    channel: "instagram",
    conversationId,
    clientMessage: message.body,
    sendReply: async (text) => {
      if (!connection.meta_page_id || !connection.meta_access_token) {
        return { success: false };
      }

      const sendResult = await sendInstagramTextMessage(
        connection.meta_page_id,
        connection.meta_access_token,
        message.from,
        text,
      );

      return { success: sendResult.success };
    },
  });
}

export async function processInstagramWebhook(
  payload: InstagramWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const messages = parseInstagramWebhookPayload(payload);

  if (messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  let processed = 0;

  for (const message of messages) {
    const { data: connection } = await admin
      .from("instagram_connections")
      .select("*")
      .eq("meta_page_id", message.pageId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection) {
      continue;
    }

    await ingestInstagramMessage(admin, connection, {
      from: message.from,
      body: message.body,
      contactName: message.contactName,
    });

    processed += 1;
  }

  if (processed > 0) {
    revalidateInstagramPaths();
  }

  return { processed };
}

export async function sendInstagramChatMessage(
  businessId: string,
  conversationId: string,
  content: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, channel, contact:contacts(phone_number)")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .eq("channel", "instagram")
    .maybeSingle();

  if (!conversation) {
    return { success: false, message: "Conversation not found." };
  }

  const contactRow = Array.isArray(conversation.contact)
    ? conversation.contact[0]
    : conversation.contact;

  const recipientId = contactRow?.phone_number?.replace(/^ig:/, "");

  if (!recipientId) {
    return { success: false, message: "Invalid Instagram recipient." };
  }

  const { data: connection } = await admin
    .from("instagram_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("instagram_status", "connected")
    .maybeSingle();

  if (!connection?.meta_page_id || !connection.meta_access_token) {
    return { success: false, message: INSTAGRAM_MESSAGES.notConfigured };
  }

  const sendResult = await sendInstagramTextMessage(
    connection.meta_page_id,
    connection.meta_access_token,
    recipientId,
    content,
  );

  if (!sendResult.success) {
    return { success: false, message: sendResult.message };
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "instagram",
    senderType: "user",
    content,
  });

  await incrementMessagingAnalytics(admin, businessId, "instagram", {
    totalMessages: 1,
  });

  return { success: true };
}
