import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BusinessNotification,
  BusinessNotificationDetails,
  BusinessNotificationKind,
} from "@/types/business-notification.types";
import type { Database, MessagingChannel } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type MessagingDbClient = SupabaseClient<Database>;

function mapRowToBusinessNotification(row: {
  id: string;
  business_id: string;
  kind: string;
  conversation_id: string;
  contact_id: string | null;
  channel: string;
  contact_name: string;
  title: string;
  body: string;
  details: unknown;
  source_id: string | null;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
}): BusinessNotification {
  const details =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as BusinessNotificationDetails)
      : {};

  return {
    id: row.id,
    businessId: row.business_id,
    kind: row.kind as BusinessNotificationKind,
    conversationId: row.conversation_id,
    contactId: row.contact_id,
    channel: row.channel as MessagingChannel,
    contactName: row.contact_name,
    title: row.title,
    body: row.body,
    details,
    sourceId: row.source_id,
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

const NOTIFICATION_SELECT =
  "id, business_id, kind, conversation_id, contact_id, channel, contact_name, title, body, details, source_id, read_at, resolved_at, created_at";

export async function listBusinessNotifications(
  admin: MessagingDbClient,
  businessId: string,
  limit = 100,
): Promise<BusinessNotification[]> {
  const { data, error } = await admin
    .from("business_notifications")
    .select(NOTIFICATION_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToBusinessNotification);
}

export async function countUnreadBusinessNotifications(
  admin: MessagingDbClient,
  businessId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("business_notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function createAiActionNotification(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId?: string | null;
  contactName?: string | null;
  agentName: string;
  actionsApplied: string[];
}): Promise<BusinessNotification | null> {
  const contactName = input.contactName?.trim() || "Customer";
  const agentName = input.agentName.trim() || "AI Agent";
  const actions = input.actionsApplied.filter((item) => item.trim().length > 0);

  if (actions.length === 0) {
    return null;
  }

  const actionsText = actions.join("; ");
  const title = `${agentName} — ${contactName}`;
  const body = actionsText;

  const { data, error } = await input.admin
    .from("business_notifications")
    .insert({
      business_id: input.businessId,
      kind: "ai_action",
      conversation_id: input.conversationId,
      contact_id: input.contactId ?? null,
      channel: input.channel,
      contact_name: contactName,
      title,
      body,
      details: {
        agentName,
        actions,
      },
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error || !data) {
    console.error("[business-notifications] failed to create ai action", error);
    return null;
  }

  return mapRowToBusinessNotification(data);
}

export async function createAiCalendarEventNotification(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId?: string | null;
  contactName?: string | null;
  summary: string;
  startDateTime: string;
}): Promise<BusinessNotification | null> {
  const contactName = input.contactName?.trim() || "Customer";
  const summary = input.summary.trim() || "Appointment";
  const title = `AI booking — ${contactName}`;
  const body = summary;

  const { data, error } = await input.admin
    .from("business_notifications")
    .insert({
      business_id: input.businessId,
      kind: "ai_calendar_event",
      conversation_id: input.conversationId,
      contact_id: input.contactId ?? null,
      channel: input.channel,
      contact_name: contactName,
      title,
      body,
      details: {
        summary,
        startDateTime: input.startDateTime,
      },
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error || !data) {
    console.error("[business-notifications] failed to create calendar event", error);
    return null;
  }

  return mapRowToBusinessNotification(data);
}

export async function countUnreadCalendarNotifications(
  admin: MessagingDbClient,
  businessId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("business_notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("kind", "ai_calendar_event")
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markCalendarNotificationsRead(input: {
  admin: MessagingDbClient;
  businessId: string;
}): Promise<void> {
  const now = new Date().toISOString();

  await input.admin
    .from("business_notifications")
    .update({ read_at: now })
    .eq("business_id", input.businessId)
    .eq("kind", "ai_calendar_event")
    .is("read_at", null);
}

export async function upsertHumanRequestNotification(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId?: string | null;
  contactName: string;
  reason: string;
  messagePreview: string;
  requestId: string;
}): Promise<BusinessNotification | null> {
  const contactName = input.contactName.trim() || "Customer";
  const reason = input.reason.trim() || "Customer needs a real person";
  const messagePreview = input.messagePreview.trim();
  const title = `Manager needed — ${contactName}`;
  const body = reason;
  const now = new Date().toISOString();

  const { data: existing } = await input.admin
    .from("business_notifications")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("kind", "human_request")
    .eq("source_id", input.requestId)
    .maybeSingle();

  const details: BusinessNotificationDetails = {
    reason,
    messagePreview,
  };

  if (existing) {
    const { data, error } = await input.admin
      .from("business_notifications")
      .update({
        contact_id: input.contactId ?? null,
        channel: input.channel,
        contact_name: contactName,
        title,
        body,
        details,
        read_at: null,
        resolved_at: null,
        created_at: now,
      })
      .eq("id", existing.id)
      .select(NOTIFICATION_SELECT)
      .single();

    if (error || !data) {
      console.error(
        "[business-notifications] failed to refresh human request",
        error,
      );
      return null;
    }

    return mapRowToBusinessNotification(data);
  }

  const { data, error } = await input.admin
    .from("business_notifications")
    .insert({
      business_id: input.businessId,
      kind: "human_request",
      conversation_id: input.conversationId,
      contact_id: input.contactId ?? null,
      channel: input.channel,
      contact_name: contactName,
      title,
      body,
      details,
      source_id: input.requestId,
    })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error || !data) {
    console.error(
      "[business-notifications] failed to create human request",
      error,
    );
    return null;
  }

  return mapRowToBusinessNotification(data);
}

export async function resolveHumanRequestNotification(input: {
  admin: MessagingDbClient;
  businessId: string;
  requestId: string;
}): Promise<void> {
  const now = new Date().toISOString();

  await input.admin
    .from("business_notifications")
    .update({
      resolved_at: now,
      read_at: now,
    })
    .eq("business_id", input.businessId)
    .eq("kind", "human_request")
    .eq("source_id", input.requestId);
}

export async function markBusinessNotificationsRead(input: {
  admin: MessagingDbClient;
  businessId: string;
  notificationIds?: string[];
}): Promise<void> {
  const now = new Date().toISOString();

  let query = input.admin
    .from("business_notifications")
    .update({ read_at: now })
    .eq("business_id", input.businessId)
    .is("read_at", null);

  if (input.notificationIds && input.notificationIds.length > 0) {
    query = query.in("id", input.notificationIds);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteBusinessNotificationForBusiness(input: {
  businessId: string;
  notificationId: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("business_notifications")
    .delete()
    .eq("business_id", input.businessId)
    .eq("id", input.notificationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchBusinessNotificationsForBusiness(
  businessId: string,
): Promise<{ data: BusinessNotification[]; unreadCount: number }> {
  const admin = createAdminClient();
  const [data, unreadCount] = await Promise.all([
    listBusinessNotifications(admin, businessId),
    countUnreadBusinessNotifications(admin, businessId),
  ]);

  return { data, unreadCount };
}

export async function markBusinessNotificationsReadForBusiness(input: {
  businessId: string;
  notificationIds?: string[];
}): Promise<void> {
  const admin = createAdminClient();

  await markBusinessNotificationsRead({
    admin,
    businessId: input.businessId,
    notificationIds: input.notificationIds,
  });
}

export async function markCalendarNotificationsReadForBusiness(
  businessId: string,
): Promise<void> {
  const admin = createAdminClient();

  await markCalendarNotificationsRead({
    admin,
    businessId,
  });
}
