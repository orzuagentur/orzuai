import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { getMetaAppId, getWhatsAppEmbeddedSignupConfigId, hasEmbeddedSignupEnv, hasSupabaseEnv } from "@/lib/env";
import {
  exchangeEmbeddedSignupCode,
  getWhatsAppApiVersion,
  sendWhatsAppTextMessage,
  subscribeAppToWaba,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp/client";
import { isEmbeddedSignupFinishEvent } from "@/lib/whatsapp/embedded-signup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateAssistantReply } from "@/services/gemini.service";
import type { WhatsappConnection } from "@/types/database.types";
import type {
  CompleteEmbeddedSignupInput,
  CompleteEmbeddedSignupResult,
  SyncWhatsAppResult,
  WhatsAppConnectionData,
  WhatsAppEmbeddedSignupConfig,
  WhatsAppWebhookPayload,
} from "@/types/whatsapp.types";
import {
  completeEmbeddedSignupSchema,
} from "@/types/whatsapp.types";
import {
  mapWhatsAppConnection,
  normalizePhoneNumber,
  parseWhatsAppWebhookPayload,
} from "@/utils/whatsapp";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: WHATSAPP_MESSAGES.genericError,
    },
  };
}

function revalidateWhatsAppPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getWhatsAppConnection(
  businessId: string,
): Promise<WhatsAppConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapWhatsAppConnection(data) : null;
}

export async function getWhatsAppEmbeddedSignupConfig(): Promise<WhatsAppEmbeddedSignupConfig> {
  const appId = getMetaAppId();
  const configId = getWhatsAppEmbeddedSignupConfigId();

  return {
    appId: appId ?? "",
    configId: configId ?? "",
    graphApiVersion: getWhatsAppApiVersion(),
    isConfigured: hasEmbeddedSignupEnv(),
  };
}

export async function completeEmbeddedSignup(
  input: CompleteEmbeddedSignupInput,
): Promise<CompleteEmbeddedSignupResult> {
  if (!hasSupabaseEnv() || !hasEmbeddedSignupEnv()) {
    return missingConfigError();
  }

  const parsed = completeEmbeddedSignupSchema.safeParse(input);

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
    if (parsed.data.finishEvent === "FINISH_ONLY_WABA") {
      return {
        success: false,
        error: {
          code: "SIGNUP_INCOMPLETE",
          message: WHATSAPP_MESSAGES.whatsappBusinessRequired,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "SIGNUP_INCOMPLETE",
        message: WHATSAPP_MESSAGES.signupIncomplete,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WHATSAPP_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: WHATSAPP_MESSAGES.alreadyConnected,
      },
    };
  }

  const tokenResult = await exchangeEmbeddedSignupCode(parsed.data.code);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: tokenResult.message,
      },
    };
  }

  const subscribeResult = await subscribeAppToWaba(
    parsed.data.wabaId,
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

  const credentialCheck = await verifyWhatsAppCredentials(
    parsed.data.phoneNumberId,
    tokenResult.accessToken,
  );

  if (!credentialCheck.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: credentialCheck.message || WHATSAPP_MESSAGES.invalidCredentials,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const phoneNumber =
    credentialCheck.displayPhoneNumber ??
    normalizePhoneNumber(parsed.data.phoneNumberId);

  const connectionPayload = {
    business_id: businessId,
    phone_number: phoneNumber,
    whatsapp_status: "connected" as const,
    meta_phone_number_id: parsed.data.phoneNumberId,
    meta_access_token: tokenResult.accessToken,
    meta_waba_id: parsed.data.wabaId,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    verification_code_hash: null,
    verification_expires_at: null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("whatsapp_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("whatsapp_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || WHATSAPP_MESSAGES.genericError,
      },
    };
  }

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: {
      connection: mapWhatsAppConnection(data),
    },
  };
}

export async function syncWhatsAppMessages(): Promise<SyncWhatsAppResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WHATSAPP_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: WHATSAPP_MESSAGES.genericError,
      },
    };
  }

  const credentialCheck = await verifyWhatsAppCredentials(
    connection.meta_phone_number_id,
    connection.meta_access_token,
  );

  if (!credentialCheck.success) {
    await supabase
      .from("whatsapp_connections")
      .update({ whatsapp_status: "disconnected" })
      .eq("id", connection.id);

    return {
      success: false,
      error: {
        code: "SYNC_FAILED",
        message: credentialCheck.message,
      },
    };
  }

  const syncedAt = new Date().toISOString();
  await supabase
    .from("whatsapp_connections")
    .update({ last_synced_at: syncedAt })
    .eq("id", connection.id);

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: { syncedAt },
  };
}

async function incrementAnalytics(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  updates: {
    totalMessages?: number;
    totalContacts?: number;
    aiReplies?: number;
  },
): Promise<void> {
  const { data: analytics } = await admin
    .from("analytics")
    .select("total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId)
    .maybeSingle();

  await admin.from("analytics").upsert(
    {
      business_id: businessId,
      total_messages:
        (analytics?.total_messages ?? 0) + (updates.totalMessages ?? 0),
      total_contacts:
        (analytics?.total_contacts ?? 0) + (updates.totalContacts ?? 0),
      ai_replies: (analytics?.ai_replies ?? 0) + (updates.aiReplies ?? 0),
    },
    { onConflict: "business_id" },
  );
}

async function processAutoReply(
  admin: ReturnType<typeof createAdminClient>,
  connection: WhatsappConnection,
  conversationId: string,
  businessId: string,
  clientMessage: string,
  recipientPhone: string,
): Promise<void> {
  const { data: aiSettings } = await admin
    .from("ai_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!aiSettings?.ai_enabled) {
    return;
  }

  if (!connection.meta_phone_number_id || !connection.meta_access_token) {
    return;
  }

  const { data: history } = await admin
    .from("messages")
    .select("sender_type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const knowledgeEntries = await listKnowledgeEntriesForBusiness(admin, businessId);

  const reply = await generateAssistantReply({
    model: aiSettings.model,
    systemPrompt: aiSettings.system_prompt,
    language: aiSettings.language,
    userMessage: clientMessage,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
    })),
    conversationHistory:
      history?.map((message) => ({
        role: message.sender_type === "client" ? "user" : "assistant",
        content: message.content,
      })) ?? [],
  });

  if (!reply.success) {
    return;
  }

  const sendResult = await sendWhatsAppTextMessage(
    connection.meta_phone_number_id,
    connection.meta_access_token,
    recipientPhone.replace(/^\+/, ""),
    reply.data.text,
  );

  if (!sendResult.success) {
    return;
  }

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    content: reply.data.text,
    ai_generated: true,
  });

  await incrementAnalytics(admin, businessId, {
    totalMessages: 1,
    aiReplies: 1,
  });
}

async function listKnowledgeEntriesForBusiness(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
) {
  const { data } = await admin
    .from("knowledge_base")
    .select("title, content, category")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(25);

  return data ?? [];
}

async function ingestIncomingMessage(
  admin: ReturnType<typeof createAdminClient>,
  connection: WhatsappConnection,
  message: {
    from: string;
    body: string;
    contactName: string;
  },
): Promise<void> {
  const businessId = connection.business_id;
  const normalizedPhone = normalizePhoneNumber(message.from);

  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        name: message.contactName,
        phone_number: normalizedPhone,
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
    .eq("status", "active")
    .maybeSingle();

  let conversationId = existingConversation?.id;

  if (!conversationId) {
    const { data: createdConversation } = await admin
      .from("conversations")
      .insert({
        business_id: businessId,
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

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "client",
    content: message.body,
    ai_generated: false,
  });

  await incrementAnalytics(admin, businessId, {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("whatsapp_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  await processAutoReply(
    admin,
    connection,
    conversationId,
    businessId,
    message.body,
    normalizedPhone,
  );
}

export async function processWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const messages = parseWhatsAppWebhookPayload(payload);

  if (messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  let processed = 0;

  for (const message of messages) {
    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("*")
      .eq("meta_phone_number_id", message.phoneNumberId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (!connection) {
      continue;
    }

    await ingestIncomingMessage(admin, connection, {
      from: message.from,
      body: message.body,
      contactName: message.contactName,
    });

    processed += 1;
  }

  if (processed > 0) {
    revalidateWhatsAppPaths();
    revalidatePath(APP_ROUTES.dashboard);
  }

  return { processed };
}
