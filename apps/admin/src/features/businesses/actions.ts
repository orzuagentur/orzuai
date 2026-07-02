"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  BusinessAccountStatus,
  BusinessAiExpenseRow,
  BusinessChannelStatus,
  BusinessDetail,
  BusinessListItem,
  PlatformBusinessControls,
} from "@/features/businesses/types";
import {
  canDeleteBusiness,
  canManageBusinessControls,
  canSuspendBusiness,
} from "@/features/businesses/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const CHANNEL_CHECKS: Array<{
  table: string;
  column: string;
  channel: string;
  label: string;
}> = [
  { table: "whatsapp_connections", column: "whatsapp_status", channel: "whatsapp", label: "WhatsApp" },
  { table: "instagram_connections", column: "instagram_status", channel: "instagram", label: "Instagram" },
  { table: "telegram_connections", column: "telegram_status", channel: "telegram", label: "Telegram" },
  { table: "email_connections", column: "email_status", channel: "email", label: "Email" },
  { table: "twilio_connections", column: "twilio_status", channel: "voice", label: "Twilio Voice" },
  { table: "website_form_connections", column: "connection_status", channel: "website_forms", label: "Формы сайта" },
];

const DEFAULT_CONTROLS: Omit<PlatformBusinessControls, "businessId" | "updatedAt"> = {
  accountStatus: "active",
  aiEnabled: true,
  voiceEnabled: true,
  smsEnabled: true,
  automationsEnabled: true,
  outboundAiEnabled: true,
  adminNotes: "",
};

function mapControlsRow(
  businessId: string,
  row: Record<string, unknown> | null,
): PlatformBusinessControls {
  if (!row) {
    return { businessId, ...DEFAULT_CONTROLS, updatedAt: null };
  }

  return {
    businessId,
    accountStatus: (row.account_status as BusinessAccountStatus) ?? "active",
    aiEnabled: Boolean(row.ai_enabled ?? true),
    voiceEnabled: Boolean(row.voice_enabled ?? true),
    smsEnabled: Boolean(row.sms_enabled ?? true),
    automationsEnabled: Boolean(row.automations_enabled ?? true),
    outboundAiEnabled: Boolean(row.outbound_ai_enabled ?? true),
    adminNotes: String(row.admin_notes ?? ""),
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

async function writeBusinessAudit(input: {
  businessId: string;
  action: string;
  actorUserId: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceRoleClient();
  await service.from("platform_business_admin_audit_log").insert({
    business_id: input.businessId,
    action: input.action,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    metadata: input.metadata ?? {},
  });
}

async function resolveOwnerEmails(
  userIds: string[],
): Promise<Map<string, string>> {
  const service = createServiceRoleClient();
  const map = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await service.auth.admin.getUserById(userId);
      if (data.user?.email) {
        map.set(userId, data.user.email);
      }
    }),
  );

  return map;
}

async function loadBusinessStats(businessIds: string[], days = 30) {
  const service = createServiceRoleClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const stats = new Map<
    string,
    BusinessListItem["stats"]
  >();

  for (const id of businessIds) {
    stats.set(id, {
      conversations: 0,
      messages30d: 0,
      aiCostUsd30d: 0,
      voiceCalls30d: 0,
      connectedChannels: 0,
    });
  }

  if (businessIds.length === 0) {
    return stats;
  }

  const [conversations, aiUsage, voiceCalls, channels] =
    await Promise.all([
      service
        .from("conversations")
        .select("business_id")
        .in("business_id", businessIds),
      service
        .from("ai_usage_logs")
        .select("business_id, estimated_cost_usd")
        .in("business_id", businessIds)
        .gte("created_at", since),
      service
        .from("voice_call_logs")
        .select("business_id")
        .in("business_id", businessIds)
        .gte("created_at", since),
      Promise.all(
        CHANNEL_CHECKS.map(async (entry) => {
          const { data } = await service
            .from(entry.table)
            .select("business_id")
            .in("business_id", businessIds)
            .eq(entry.column, "connected");
          return { table: entry.table, rows: data ?? [] };
        }),
      ),
    ]);

  const conversationCounts = new Map<string, number>();
  for (const row of conversations.data ?? []) {
    const id = row.business_id as string;
    conversationCounts.set(id, (conversationCounts.get(id) ?? 0) + 1);
  }

  const messageCounts = new Map<string, number>();
  if (conversationCounts.size > 0) {
    const conversationIds: string[] = [];
    const conversationBusiness = new Map<string, string>();

    const { data: conversationRows } = await service
      .from("conversations")
      .select("id, business_id")
      .in("business_id", businessIds);

    for (const row of conversationRows ?? []) {
      conversationIds.push(row.id as string);
      conversationBusiness.set(row.id as string, row.business_id as string);
    }

    if (conversationIds.length > 0) {
      const { data: messageRows } = await service
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .gte("sent_at", since);

      for (const row of messageRows ?? []) {
        const businessId = conversationBusiness.get(row.conversation_id as string);
        if (!businessId) continue;
        messageCounts.set(businessId, (messageCounts.get(businessId) ?? 0) + 1);
      }
    }
  }

  for (const id of businessIds) {
    const current = stats.get(id);
    if (!current) continue;
    current.conversations = conversationCounts.get(id) ?? 0;
    current.messages30d = messageCounts.get(id) ?? 0;
  }

  for (const row of aiUsage.data ?? []) {
    const current = stats.get(row.business_id);
    if (current) {
      current.aiCostUsd30d += Number(row.estimated_cost_usd ?? 0);
    }
  }

  for (const row of voiceCalls.data ?? []) {
    const current = stats.get(row.business_id);
    if (current) current.voiceCalls30d += 1;
  }

  for (const channelResult of channels) {
    for (const row of channelResult.rows as Array<{ business_id: string }>) {
      const current = stats.get(row.business_id);
      if (current) current.connectedChannels += 1;
    }
  }

  return stats;
}

async function loadControlsMap(businessIds: string[]) {
  const service = createServiceRoleClient();
  const map = new Map<string, PlatformBusinessControls>();

  if (businessIds.length === 0) {
    return map;
  }

  const { data } = await service
    .from("platform_business_controls")
    .select("*")
    .in("business_id", businessIds);

  for (const id of businessIds) {
    map.set(id, mapControlsRow(id, null));
  }

  for (const row of data ?? []) {
    map.set(
      row.business_id as string,
      mapControlsRow(row.business_id as string, row as Record<string, unknown>),
    );
  }

  return map;
}

export async function fetchBusinessesAction(input?: {
  query?: string;
  plan?: string;
  status?: BusinessAccountStatus;
}): Promise<{ success: true; businesses: BusinessListItem[] } | { success: false; message: string }> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    let query = service
      .from("businesses")
      .select(
        "id, business_name, email, phone, subscription_plan, subscription_status, created_at, user_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    const search = input?.query?.trim();
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    if (input?.plan?.trim()) {
      query = query.eq("subscription_plan", input.plan.trim());
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, message: error.message };
    }

    const rows = data ?? [];
    const businessIds = rows.map((row) => row.id as string);
    const ownerEmails = await resolveOwnerEmails(
      [...new Set(rows.map((row) => row.user_id as string))],
    );
    const [statsMap, controlsMap] = await Promise.all([
      loadBusinessStats(businessIds),
      loadControlsMap(businessIds),
    ]);

    let businesses: BusinessListItem[] = rows.map((row) => ({
      id: row.id as string,
      businessName: row.business_name as string,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      subscriptionPlan: row.subscription_plan as string,
      subscriptionStatus: row.subscription_status as string,
      createdAt: row.created_at as string,
      ownerEmail: ownerEmails.get(row.user_id as string) ?? null,
      controls: controlsMap.get(row.id as string) ?? null,
      stats: statsMap.get(row.id as string) ?? {
        conversations: 0,
        messages30d: 0,
        aiCostUsd30d: 0,
        voiceCalls30d: 0,
        connectedChannels: 0,
      },
    }));

    if (input?.status) {
      businesses = businesses.filter(
        (business) => business.controls?.accountStatus === input.status,
      );
    }

    return { success: true, businesses };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load businesses.",
    };
  }
}

async function loadChannelStatuses(businessId: string): Promise<BusinessChannelStatus[]> {
  const service = createServiceRoleClient();

  const results = await Promise.all(
    CHANNEL_CHECKS.map(async (entry) => {
      const { data } = await service
        .from(entry.table)
        .select(entry.column)
        .eq("business_id", businessId)
        .maybeSingle();

      const status = String((data as Record<string, string> | null)?.[entry.column] ?? "disconnected");
      return {
        channel: entry.channel,
        label: entry.label,
        status,
        connected: status === "connected",
      };
    }),
  );

  return results;
}

export async function fetchBusinessDetailAction(
  businessId: string,
  statsDays = 30,
): Promise<{ success: true; business: BusinessDetail } | { success: false; message: string }> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data: row, error } = await service
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();

    if (error || !row) {
      return { success: false, message: "Business not found." };
    }

    const [ownerEmails, statsMap, controlsMap, channels, aiConfig, voiceConfig, supportThread] =
      await Promise.all([
        resolveOwnerEmails([row.user_id as string]),
        loadBusinessStats([businessId], statsDays),
        loadControlsMap([businessId]),
        loadChannelStatuses(businessId),
        service.from("business_ai_config").select("*").eq("business_id", businessId).maybeSingle(),
        service.from("voice_agent_config").select("*").eq("business_id", businessId).maybeSingle(),
        service
          .from("platform_support_threads")
          .select("id")
          .eq("business_id", businessId)
          .maybeSingle(),
      ]);

    const business: BusinessDetail = {
      id: row.id as string,
      businessName: row.business_name as string,
      businessDescription: (row.business_description as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      subscriptionPlan: row.subscription_plan as string,
      subscriptionStatus: row.subscription_status as string,
      stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
      stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
      createdAt: row.created_at as string,
      ownerUserId: row.user_id as string,
      ownerEmail: ownerEmails.get(row.user_id as string) ?? null,
      controls: controlsMap.get(businessId) ?? null,
      stats: statsMap.get(businessId) ?? {
        conversations: 0,
        messages30d: 0,
        aiCostUsd30d: 0,
        voiceCalls30d: 0,
        connectedChannels: 0,
      },
      channels,
      aiConfig: aiConfig.data
        ? {
            salesAgentEnabled: Boolean(aiConfig.data.sales_agent_enabled),
            autoTaskEnabled: Boolean(aiConfig.data.auto_task_enabled),
            sentimentAnalysisEnabled: Boolean(aiConfig.data.sentiment_analysis_enabled),
            followUpAgentEnabled: Boolean(aiConfig.data.follow_up_agent_enabled),
          }
        : null,
      voiceConfig: voiceConfig.data
        ? {
            enabled: Boolean(voiceConfig.data.enabled),
            aiEnabled: Boolean(voiceConfig.data.ai_enabled),
            smsEnabled: Boolean(voiceConfig.data.sms_enabled),
            outboundEnabled: Boolean(voiceConfig.data.outbound_enabled),
            inboundEnabled: Boolean(voiceConfig.data.inbound_enabled),
            phoneNumber: (voiceConfig.data.phone_number as string | null) ?? null,
          }
        : null,
      supportThreadId: (supportThread.data?.id as string | null) ?? null,
    };

    return { success: true, business };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load business.",
    };
  }
}

export async function fetchBusinessAiExpensesAction(
  businessId: string,
): Promise<{ success: true; rows: BusinessAiExpenseRow[] } | { success: false; message: string }> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await service
      .from("ai_usage_logs")
      .select("provider, call_type, estimated_cost_usd")
      .eq("business_id", businessId)
      .gte("created_at", since30d);

    if (error) {
      return { success: false, message: error.message };
    }

    const grouped = new Map<string, BusinessAiExpenseRow>();

    for (const row of data ?? []) {
      const key = `${row.provider}:${row.call_type}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          provider: String(row.provider),
          callType: String(row.call_type),
          totalCostUsd: Number(row.estimated_cost_usd ?? 0),
          callCount: 1,
        });
        continue;
      }

      existing.totalCostUsd += Number(row.estimated_cost_usd ?? 0);
      existing.callCount += 1;
    }

    return {
      success: true,
      rows: [...grouped.values()].sort((a, b) => b.totalCostUsd - a.totalCostUsd),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load AI expenses.",
    };
  }
}

function buildDailySeries(days: number) {
  const series = new Map<
    string,
    { messages: number; aiCostUsd: number; voiceCalls: number }
  >();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    series.set(date.toISOString().slice(0, 10), {
      messages: 0,
      aiCostUsd: 0,
      voiceCalls: 0,
    });
  }

  return series;
}

export async function fetchBusinessAnalyticsSeriesAction(
  businessId: string,
  days = 30,
): Promise<
  | { success: true; analytics: import("@/features/businesses/types").BusinessAnalyticsSeries }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const safeDays = Math.min(Math.max(days, 7), 90);
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    const series = buildDailySeries(safeDays);

    const bump = (
      isoDate: string,
      field: "messages" | "aiCostUsd" | "voiceCalls",
      amount = 1,
    ) => {
      const key = isoDate.slice(0, 10);
      const bucket = series.get(key);
      if (!bucket) return;
      bucket[field] += amount;
    };

    const [{ data: conversations }, { data: aiRows }, { data: voiceRows }] =
      await Promise.all([
        service.from("conversations").select("id").eq("business_id", businessId),
        service
          .from("ai_usage_logs")
          .select("created_at, estimated_cost_usd")
          .eq("business_id", businessId)
          .gte("created_at", since),
        service
          .from("voice_call_logs")
          .select("created_at")
          .eq("business_id", businessId)
          .gte("created_at", since),
      ]);

    const conversationIds = (conversations ?? []).map((row) => row.id as string);

    if (conversationIds.length > 0) {
      const { data: messageRows } = await service
        .from("messages")
        .select("sent_at")
        .in("conversation_id", conversationIds)
        .gte("sent_at", since);

      for (const row of messageRows ?? []) {
        bump(row.sent_at as string, "messages");
      }
    }

    for (const row of aiRows ?? []) {
      bump(row.created_at as string, "aiCostUsd", Number(row.estimated_cost_usd ?? 0));
    }

    for (const row of voiceRows ?? []) {
      bump(row.created_at as string, "voiceCalls");
    }

    const items = [...series.entries()].map(([date, values]) => ({
      date,
      messages: values.messages,
      aiCostUsd: Number(values.aiCostUsd.toFixed(4)),
      voiceCalls: values.voiceCalls,
    }));

    return {
      success: true,
      analytics: {
        days: safeDays,
        totals: items.reduce(
          (acc, item) => ({
            messages: acc.messages + item.messages,
            aiCostUsd: acc.aiCostUsd + item.aiCostUsd,
            voiceCalls: acc.voiceCalls + item.voiceCalls,
          }),
          { messages: 0, aiCostUsd: 0, voiceCalls: 0 },
        ),
        series: items,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load analytics.",
    };
  }
}

const adminSmsSchema = z.object({
  businessId: z.string().uuid(),
  phoneNumber: z.string().trim().min(8).max(32),
  body: z.string().trim().min(1).max(1600),
});

export async function sendAdminTenantSmsAction(input: z.infer<typeof adminSmsSchema>) {
  const parsed = adminSmsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid SMS payload." };
  }

  try {
    const { user, role } = await requirePlatformAdmin();

    if (role !== "owner" && role !== "admin") {
      return { success: false as const, message: "Insufficient permissions." };
    }

    const { sendTenantSmsFromAdmin } = await import("@/features/sms/send-tenant-sms");

    const result = await sendTenantSmsFromAdmin({
      businessId: parsed.data.businessId,
      phoneNumber: parsed.data.phoneNumber,
      body: parsed.data.body,
    });

    if (!result.success) {
      return { success: false as const, message: result.message ?? "SMS send failed." };
    }

    await writeBusinessAudit({
      businessId: parsed.data.businessId,
      action: "admin.sms_sent",
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      metadata: {
        phoneNumber: parsed.data.phoneNumber,
        preview: parsed.data.body.slice(0, 120),
      },
    });

    revalidatePath(`/businesses/${parsed.data.businessId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "SMS send failed.",
    };
  }
}

export async function createPlatformPreviewLinkAction(businessId: string) {
  try {
    const { user, role } = await requirePlatformAdmin();

    if (role !== "owner" && role !== "admin") {
      return { success: false as const, message: "Insufficient permissions." };
    }

    const { createPlatformPreviewToken } = await import(
      "@orzuai/lib/platform-preview/token"
    );
    const token = createPlatformPreviewToken({
      businessId,
      adminUserId: user.id,
      adminEmail: user.email ?? "",
    });

    if (!token) {
      return {
        success: false as const,
        message: "Preview signing secret is not configured.",
      };
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
      "http://localhost:3000";
    const url = `${appUrl}/platform-preview?token=${encodeURIComponent(token)}`;

    await writeBusinessAudit({
      businessId,
      action: "impersonation.preview_link",
      actorUserId: user.id,
      actorEmail: user.email ?? "",
      metadata: { expiresInMinutes: 60 },
    });

    return { success: true as const, url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Unable to create preview link.",
    };
  }
}

const controlsSchema = z.object({
  businessId: z.string().uuid(),
  accountStatus: z.enum(["active", "suspended", "readonly"]).optional(),
  aiEnabled: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  automationsEnabled: z.boolean().optional(),
  outboundAiEnabled: z.boolean().optional(),
  adminNotes: z.string().max(5000).optional(),
});

export async function updateBusinessControlsAction(
  input: z.infer<typeof controlsSchema>,
) {
  const parsed = controlsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid input." };
  }

  const { user, role } = await requirePlatformAdmin();

  if (!canManageBusinessControls(role)) {
    return { success: false as const, message: "Forbidden." };
  }

  if (
    parsed.data.accountStatus &&
    parsed.data.accountStatus !== "active" &&
    !canSuspendBusiness(role)
  ) {
    return { success: false as const, message: "Insufficient permissions." };
  }

  const service = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    updated_by: user.id,
  };

  if (parsed.data.accountStatus !== undefined) patch.account_status = parsed.data.accountStatus;
  if (parsed.data.aiEnabled !== undefined) patch.ai_enabled = parsed.data.aiEnabled;
  if (parsed.data.voiceEnabled !== undefined) patch.voice_enabled = parsed.data.voiceEnabled;
  if (parsed.data.smsEnabled !== undefined) patch.sms_enabled = parsed.data.smsEnabled;
  if (parsed.data.automationsEnabled !== undefined) {
    patch.automations_enabled = parsed.data.automationsEnabled;
  }
  if (parsed.data.outboundAiEnabled !== undefined) {
    patch.outbound_ai_enabled = parsed.data.outboundAiEnabled;
  }
  if (parsed.data.adminNotes !== undefined) patch.admin_notes = parsed.data.adminNotes;

  const { error } = await service.from("platform_business_controls").upsert({
    business_id: parsed.data.businessId,
    ...patch,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  if (parsed.data.aiEnabled !== undefined) {
    await service
      .from("business_ai_config")
      .upsert({
        business_id: parsed.data.businessId,
        sales_agent_enabled: parsed.data.aiEnabled,
        follow_up_agent_enabled: parsed.data.aiEnabled,
      });
  }

  if (parsed.data.voiceEnabled !== undefined || parsed.data.smsEnabled !== undefined) {
    const voicePatch: Record<string, unknown> = {
      business_id: parsed.data.businessId,
    };
    if (parsed.data.voiceEnabled !== undefined) {
      voicePatch.enabled = parsed.data.voiceEnabled;
      voicePatch.ai_enabled = parsed.data.voiceEnabled;
    }
    if (parsed.data.smsEnabled !== undefined) {
      voicePatch.sms_enabled = parsed.data.smsEnabled;
    }
    await service.from("voice_agent_config").upsert(voicePatch);
  }

  await writeBusinessAudit({
    businessId: parsed.data.businessId,
    action: "controls.updated",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    metadata: patch,
  });

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${parsed.data.businessId}`);

  return { success: true as const };
}

const deleteSchema = z.object({
  businessId: z.string().uuid(),
  confirmName: z.string().trim().min(1),
});

export async function deleteBusinessAction(input: z.infer<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false as const, message: "Invalid input." };
  }

  const { user, role } = await requirePlatformAdmin();

  if (!canDeleteBusiness(role)) {
    return { success: false as const, message: "Only owners can delete businesses." };
  }

  const service = createServiceRoleClient();
  const { data: business } = await service
    .from("businesses")
    .select("business_name")
    .eq("id", parsed.data.businessId)
    .maybeSingle();

  if (!business) {
    return { success: false as const, message: "Business not found." };
  }

  if (business.business_name !== parsed.data.confirmName) {
    return { success: false as const, message: "Confirmation name does not match." };
  }

  await writeBusinessAudit({
    businessId: parsed.data.businessId,
    action: "business.deleted",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    metadata: { businessName: business.business_name },
  });

  const { error } = await service
    .from("businesses")
    .delete()
    .eq("id", parsed.data.businessId);

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/businesses");
  return { success: true as const };
}

export async function ensureSupportThreadAction(businessId: string) {
  const { user } = await requirePlatformAdmin();
  const service = createServiceRoleClient();

  const { data: existing } = await service
    .from("platform_support_threads")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing?.id) {
    return { success: true as const, threadId: existing.id as string };
  }

  const { data, error } = await service
    .from("platform_support_threads")
    .insert({ business_id: businessId })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false as const, message: error?.message ?? "Failed to create thread." };
  }

  await writeBusinessAudit({
    businessId,
    action: "support.thread_created",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  });

  return { success: true as const, threadId: data.id as string };
}
