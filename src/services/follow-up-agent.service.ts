import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/services/llm.service";
import {
  ensurePlatformPromptsLoaded,
  getPlatformPromptContent,
} from "@/services/platform-prompts.service";
import { getAiAssistantProfileForBusiness } from "@/services/ai-assistant-profile.service";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
} from "@/services/messaging.service";
import { sendTelegramChatMessage } from "@/services/telegram.service";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import { assertFollowUpAgentAllowed } from "@/services/entitlement.service";
import { getCachedWhatsAppDeliveryConnection } from "@/services/channels/connection-cache";
import type { Database, MessagingChannel } from "@/types/database.types";

const HOUR_MS = 60 * 60 * 1000;
const FOLLOW_UP_WINDOWS = [
  { day: 1 as const, hours: 24 },
  { day: 2 as const, hours: 48 },
] as const;
const CLAIM_BATCH_SIZE = 50;

type MessagingDbClient = SupabaseClient<Database>;

type FollowUpJobRow = Database["public"]["Tables"]["follow_up_jobs"]["Row"];

type FollowUpCandidate = {
  jobId: string;
  conversationId: string;
  businessId: string;
  channel: MessagingChannel;
  followUpDay: 1 | 2;
  contactName: string;
  lastOutboundContent: string;
  attemptCount: number;
  maxAttempts: number;
};

async function isChannelConnected(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
): Promise<boolean> {
  if (channel === "whatsapp") {
    const { data } = await admin
      .from("whatsapp_connections")
      .select("whatsapp_status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.whatsapp_status === "connected";
  }

  if (channel === "whatsapp_web") {
    const { data } = await admin
      .from("whatsapp_web_connections")
      .select("status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.status === "connected";
  }

  if (channel === "instagram") {
    return false;
  }

  if (channel === "telegram") {
    const { data } = await admin
      .from("telegram_connections")
      .select("telegram_status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.telegram_status === "connected";
  }

  if (channel === "telegram_user") {
    const { data } = await admin
      .from("telegram_user_connections")
      .select("status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.status === "connected";
  }

  return channel === "website_forms";
}

async function generateFollowUpMessage(input: {
  businessId: string;
  contactName: string;
  channel: MessagingChannel;
  lastOutboundContent: string;
  followUpDay: 1 | 2;
}): Promise<{ content: string } | null> {
  const profile = await getAiAssistantProfileForBusiness(input.businessId);

  if (!hasGeminiEnv()) {
    return {
      content: `Hi ${input.contactName}, just checking in — let us know if you still need help.`,
    };
  }

  await ensurePlatformPromptsLoaded();

  const systemInstruction = [
    profile.systemPrompt,
    getPlatformPromptContent("follow_up"),
  ].join("\n\n");

  const result = await generateText({
    businessId: input.businessId,
    callType: "follow_up",
    prompt: [
      `Write a short follow-up #${input.followUpDay} for ${input.channel}.`,
      `Reply language: ${profile.language}`,
      `Customer name: ${input.contactName}`,
      `Previous message we sent: ${input.lastOutboundContent}`,
      "Goal: gentle nudge, 1-2 sentences, no markdown.",
    ]
      .filter(Boolean)
      .join("\n"),
    systemInstruction,
  });

  if (!result.success) {
    return null;
  }

  return {
    content: result.data.text.trim().slice(0, 500),
  };
}

async function sendFollowUpOnChannel(input: {
  admin: MessagingDbClient;
  candidate: FollowUpCandidate;
  content: string;
}): Promise<boolean> {
  const { admin, candidate } = input;

  if (candidate.channel === "website_forms") {
    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
    });

    await incrementMessagingAnalytics(admin, candidate.businessId, candidate.channel, {
      totalMessages: 1,
      aiReplies: 1,
    });

    return true;
  }

  if (candidate.channel === "whatsapp") {
    const { data: conversation } = await admin
      .from("conversations")
      .select("contact:contacts(phone_number)")
      .eq("id", candidate.conversationId)
      .eq("business_id", candidate.businessId)
      .maybeSingle();

    const contact = Array.isArray(conversation?.contact)
      ? conversation.contact[0]
      : conversation?.contact;

    const whatsappConnection = await getCachedWhatsAppDeliveryConnection(
      admin,
      candidate.businessId,
    );

    if (
      !contact?.phone_number ||
      !whatsappConnection?.meta_phone_number_id ||
      !whatsappConnection.meta_access_token
    ) {
      return false;
    }

    const sendResult = await sendWhatsAppTextMessage(
      whatsappConnection.meta_phone_number_id,
      whatsappConnection.meta_access_token,
      contact.phone_number.replace(/[^\d+]/g, ""),
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }

    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
    });
  } else if (candidate.channel === "instagram") {
    return false;
  } else if (candidate.channel === "telegram") {
    const sendResult = await sendTelegramChatMessage(
      candidate.businessId,
      candidate.conversationId,
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }
  } else {
    return false;
  }

  await incrementMessagingAnalytics(admin, candidate.businessId, candidate.channel, {
    totalMessages: 1,
    aiReplies: 1,
  });

  return true;
}

/** Schedule 24h/48h follow-up jobs after an AI reply is delivered. */
/** Explicit orchestrator-driven follow-up (custom delay, day-1 slot). */
export async function scheduleOrchestratorFollowUp(input: {
  admin?: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  delayHours?: number;
  contactName?: string | null;
  reason?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  if (!["whatsapp", "telegram", "website_forms"].includes(input.channel)) {
    return;
  }

  const admin = input.admin ?? createAdminClient();
  const delayHours = Math.max(1, Math.min(168, input.delayHours ?? 24));
  const scheduledAt = new Date(Date.now() + delayHours * HOUR_MS).toISOString();
  const contactName = input.contactName?.trim() || "there";
  const content = (
    input.reason?.trim() ||
    "Following up on our conversation — happy to help with the next step."
  ).slice(0, 2000);

  const { error } = await admin.from("follow_up_jobs").upsert(
    {
      business_id: input.businessId,
      conversation_id: input.conversationId,
      channel: input.channel,
      follow_up_day: 1,
      scheduled_at: scheduledAt,
      status: "pending",
      last_outbound_content: content,
      contact_name: contactName.slice(0, 200),
      attempt_count: 0,
      last_error: null,
    },
    { onConflict: "conversation_id,follow_up_day" },
  );

  if (error) {
    console.warn(
      "[follow-up-agent] orchestrator schedule failed",
      JSON.stringify({
        conversationId: input.conversationId,
        error: error.message,
      }),
    );
  }
}

export async function scheduleFollowUpJobsAfterAiReply(input: {
  admin?: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  outboundContent: string;
  contactName?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  if (
    !["whatsapp", "telegram", "website_forms"].includes(input.channel)
  ) {
    return;
  }

  const admin = input.admin ?? createAdminClient();

  const [{ data: aiSettings }, { data: followUpConfig }, { data: alreadySent }] =
    await Promise.all([
      admin
        .from("ai_settings")
        .select("ai_enabled")
        .eq("business_id", input.businessId)
        .eq("channel", input.channel)
        .maybeSingle(),
      admin
        .from("business_ai_config")
        .select("follow_up_agent_enabled")
        .eq("business_id", input.businessId)
        .maybeSingle(),
      admin
        .from("conversation_follow_ups")
        .select("follow_up_day")
        .eq("conversation_id", input.conversationId)
        .eq("business_id", input.businessId),
    ]);

  if (!aiSettings?.ai_enabled) {
    return;
  }

  if (followUpConfig?.follow_up_agent_enabled === false) {
    return;
  }

  const entitlement = await assertFollowUpAgentAllowed(input.businessId);

  if (!entitlement.allowed) {
    return;
  }

  const sentDays = new Set(
    (alreadySent ?? []).map((row) => Number(row.follow_up_day)),
  );
  const now = Date.now();
  const contactName = input.contactName?.trim() || "there";
  const content = input.outboundContent.trim().slice(0, 2000);

  for (const window of FOLLOW_UP_WINDOWS) {
    if (sentDays.has(window.day)) {
      continue;
    }

    const scheduledAt = new Date(now + window.hours * HOUR_MS).toISOString();

    const { error } = await admin.from("follow_up_jobs").upsert(
      {
        business_id: input.businessId,
        conversation_id: input.conversationId,
        channel: input.channel,
        follow_up_day: window.day,
        scheduled_at: scheduledAt,
        status: "pending",
        last_outbound_content: content,
        contact_name: contactName.slice(0, 200),
        attempt_count: 0,
        last_error: null,
      },
      { onConflict: "conversation_id,follow_up_day" },
    );

    if (error) {
      console.warn(
        "[follow-up-agent] schedule failed",
        JSON.stringify({
          conversationId: input.conversationId,
          day: window.day,
          error: error.message,
        }),
      );
    }
  }
}

/** Cancel pending follow-ups when the customer replies. */
export async function cancelPendingFollowUpJobs(input: {
  admin?: MessagingDbClient;
  businessId: string;
  conversationId: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = input.admin ?? createAdminClient();

  await admin
    .from("follow_up_jobs")
    .update({
      status: "cancelled",
      last_error: "cancelled_by_client_reply",
    })
    .eq("business_id", input.businessId)
    .eq("conversation_id", input.conversationId)
    .eq("status", "pending");
}

async function markFollowUpJobRetry(
  admin: MessagingDbClient,
  job: FollowUpCandidate,
  errorMessage: string,
): Promise<void> {
  const attemptCount = job.attemptCount + 1;
  const exhausted = attemptCount >= job.maxAttempts;

  const patch: Database["public"]["Tables"]["follow_up_jobs"]["Update"] = {
    status: exhausted ? "failed" : "pending",
    attempt_count: attemptCount,
    last_error: errorMessage.slice(0, 500),
  };

  if (!exhausted) {
    patch.scheduled_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  await admin
    .from("follow_up_jobs")
    .update(patch)
    .eq("id", job.jobId)
    .eq("business_id", job.businessId);
}

async function markFollowUpJobCompleted(
  admin: MessagingDbClient,
  job: FollowUpCandidate,
): Promise<void> {
  await admin
    .from("follow_up_jobs")
    .update({
      status: "completed",
      last_error: null,
    })
    .eq("id", job.jobId)
    .eq("business_id", job.businessId);
}

async function claimDueFollowUpJobs(
  admin: MessagingDbClient,
): Promise<FollowUpCandidate[]> {
  const { data, error } = await admin.rpc("claim_follow_up_jobs", {
    p_limit: CLAIM_BATCH_SIZE,
  });

  if (error) {
    console.error("[follow-up-agent] claim failed", error.message);
    return [];
  }

  return ((data ?? []) as FollowUpJobRow[]).map((job) => ({
    jobId: job.id,
    conversationId: job.conversation_id,
    businessId: job.business_id,
    channel: job.channel,
    followUpDay: (job.follow_up_day === 2 ? 2 : 1) as 1 | 2,
    contactName: job.contact_name || "there",
    lastOutboundContent: job.last_outbound_content,
    attemptCount: job.attempt_count ?? 0,
    maxAttempts: job.max_attempts ?? 3,
  }));
}

export async function runDueConversationFollowUps(): Promise<{
  processed: number;
  sent: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, sent: 0 };
  }

  const admin = createAdminClient();
  const jobs = await claimDueFollowUpJobs(admin);
  let sent = 0;
  const followUpAllowedByBusiness = new Map<string, boolean>();

  for (const candidate of jobs) {
    let allowed = followUpAllowedByBusiness.get(candidate.businessId);

    if (allowed === undefined) {
      const check = await assertFollowUpAgentAllowed(candidate.businessId);
      allowed = check.allowed;
      followUpAllowedByBusiness.set(candidate.businessId, allowed);
    }

    if (!allowed) {
      await markFollowUpJobRetry(admin, candidate, "follow_up_not_allowed");
      continue;
    }

    const { data: alreadySent } = await admin
      .from("conversation_follow_ups")
      .select("id")
      .eq("conversation_id", candidate.conversationId)
      .eq("follow_up_day", candidate.followUpDay)
      .maybeSingle();

    if (alreadySent) {
      await markFollowUpJobCompleted(admin, candidate);
      continue;
    }

    const { data: latestMessage } = await admin
      .from("messages")
      .select("sender_type")
      .eq("conversation_id", candidate.conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMessage?.sender_type === "client") {
      await admin
        .from("follow_up_jobs")
        .update({
          status: "cancelled",
          last_error: "client_replied_before_send",
        })
        .eq("id", candidate.jobId);
      continue;
    }

    if (candidate.channel === "instagram") {
      await admin
        .from("follow_up_jobs")
        .update({
          status: "cancelled",
          last_error: "instagram_unsupported",
        })
        .eq("id", candidate.jobId);
      continue;
    }

    const connected = await isChannelConnected(
      admin,
      candidate.businessId,
      candidate.channel,
    );

    if (!connected) {
      await markFollowUpJobRetry(admin, candidate, "channel_not_connected");
      continue;
    }

    const generated = await generateFollowUpMessage({
      businessId: candidate.businessId,
      contactName: candidate.contactName,
      channel: candidate.channel,
      lastOutboundContent: candidate.lastOutboundContent,
      followUpDay: candidate.followUpDay,
    });

    if (!generated) {
      await markFollowUpJobRetry(admin, candidate, "generation_failed");
      continue;
    }

    const delivered = await sendFollowUpOnChannel({
      admin,
      candidate,
      content: generated.content,
    });

    if (!delivered) {
      await markFollowUpJobRetry(admin, candidate, "send_failed");
      continue;
    }

    const { error } = await admin.from("conversation_follow_ups").insert({
      conversation_id: candidate.conversationId,
      business_id: candidate.businessId,
      follow_up_day: candidate.followUpDay,
    });

    if (error && error.code !== "23505") {
      await markFollowUpJobRetry(admin, candidate, error.message);
      continue;
    }

    await markFollowUpJobCompleted(admin, candidate);
    sent += 1;
  }

  return {
    processed: jobs.length,
    sent,
  };
}
