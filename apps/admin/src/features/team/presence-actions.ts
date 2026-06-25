"use server";

import { revalidatePath } from "next/cache";

import { roleLabel } from "@/features/team/permissions";
import { isAdminPresent } from "@/features/team/presence";
import type {
  PlatformAdminActivityEvent,
  PlatformAdminNotification,
} from "@/features/team/types";
import {
  renderInviteAcceptedEmail,
} from "@/lib/email/team-templates";
import { sendAdminEmail } from "@/lib/email/send";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

type ActivityEventType = PlatformAdminActivityEvent["eventType"];

type AdminPresenceRow = {
  accepted_at: string | null;
  created_by: string | null;
  role: string;
  is_present: boolean;
  last_seen_at: string | null;
};

async function logActivity(input: {
  userId: string;
  email: string;
  eventType: ActivityEventType;
}): Promise<void> {
  const service = createServiceRoleClient();
  const { error } = await service.from("platform_admin_activity").insert({
    user_id: input.userId,
    email: input.email,
    event_type: input.eventType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function createNotification(input: {
  recipientUserId: string;
  type: PlatformAdminNotification["type"];
  title: string;
  body: string;
  actorUserId: string | null;
  actorEmail: string;
}): Promise<void> {
  const service = createServiceRoleClient();
  const { error } = await service.from("platform_admin_notifications").insert({
    recipient_user_id: input.recipientUserId,
    type: input.type,
    title: input.title,
    body: input.body,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function notifyInviterOnAccept(input: {
  inviterUserId: string;
  inviteeUserId: string;
  inviteeEmail: string;
  role: string;
}): Promise<void> {
  const service = createServiceRoleClient();
  const { data: inviterAuth, error } = await service.auth.admin.getUserById(
    input.inviterUserId,
  );

  if (error || !inviterAuth.user.email) {
    return;
  }

  const role = input.role as "owner" | "admin" | "support";
  const title = `${input.inviteeEmail} принял приглашение`;
  const body = `Администратор вошёл в панель с ролью ${roleLabel(role)}.`;

  await createNotification({
    recipientUserId: input.inviterUserId,
    type: "invite_accepted",
    title,
    body,
    actorUserId: input.inviteeUserId,
    actorEmail: input.inviteeEmail,
  });

  const email = renderInviteAcceptedEmail({
    inviterEmail: inviterAuth.user.email,
    inviteeEmail: input.inviteeEmail,
    role,
  });

  await sendAdminEmail({
    to: inviterAuth.user.email,
    subject: email.subject,
    html: email.html,
  });
}

async function getPresenceRow(userId: string): Promise<AdminPresenceRow> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("platform_admins")
    .select("accepted_at, created_by, role, is_present, last_seen_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Admin row not found");
  }

  return data as AdminPresenceRow;
}

async function applyPresenceTransition(input: {
  userId: string;
  email: string;
  row: AdminPresenceRow;
  eventOnOnline: ActivityEventType;
}): Promise<void> {
  const service = createServiceRoleClient();
  const now = new Date().toISOString();
  const wasPresent = isAdminPresent(
    input.row.is_present,
    input.row.last_seen_at,
  );
  const isFirstAccept = !input.row.accepted_at;

  const update: Record<string, unknown> = {
    is_present: true,
    last_seen_at: now,
  };

  if (isFirstAccept) {
    update.accepted_at = now;
  }

  const { error } = await service
    .from("platform_admins")
    .update(update)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(error.message);
  }

  if (isFirstAccept) {
    await logActivity({
      userId: input.userId,
      email: input.email,
      eventType: "login",
    });

    if (input.row.created_by && input.row.created_by !== input.userId) {
      await notifyInviterOnAccept({
        inviterUserId: input.row.created_by,
        inviteeUserId: input.userId,
        inviteeEmail: input.email,
        role: input.row.role,
      });
    }

    return;
  }

  if (!wasPresent) {
    await logActivity({
      userId: input.userId,
      email: input.email,
      eventType: input.eventOnOnline,
    });
  }
}

export async function touchPresenceAction(): Promise<{ success: boolean }> {
  try {
    const { user } = await requirePlatformAdmin();
    const row = await getPresenceRow(user.id);

    await applyPresenceTransition({
      userId: user.id,
      email: user.email ?? "",
      row,
      eventOnOnline: "online",
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markOfflineAction(input?: {
  eventType?: "offline" | "logout";
}): Promise<{ success: boolean }> {
  try {
    const { user } = await requirePlatformAdmin();
    const row = await getPresenceRow(user.id);
    const wasPresent = isAdminPresent(row.is_present, row.last_seen_at);
    const eventType = input?.eventType ?? "offline";

    const service = createServiceRoleClient();
    const { error } = await service
      .from("platform_admins")
      .update({ is_present: false })
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    if (wasPresent) {
      await logActivity({
        userId: user.id,
        email: user.email ?? "",
        eventType,
      });
    }

    revalidatePath("/team");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function fetchActivityFeedAction(): Promise<{
  success: true;
  events: PlatformAdminActivityEvent[];
  unreadCount: number;
  notifications: PlatformAdminNotification[];
}> {
  const { supabase, user } = await requirePlatformAdmin();

  const [activityResult, notificationsResult] = await Promise.all([
    supabase
      .from("platform_admin_activity")
      .select("id, user_id, email, event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("platform_admin_notifications")
      .select(
        "id, type, title, body, actor_user_id, actor_email, read_at, created_at",
      )
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (activityResult.error) {
    throw new Error(activityResult.error.message);
  }

  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message);
  }

  const events = (activityResult.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    eventType: row.event_type as ActivityEventType,
    createdAt: row.created_at,
  }));

  const notifications = (notificationsResult.data ?? []).map((row) => ({
    id: row.id,
    type: row.type as PlatformAdminNotification["type"],
    title: row.title,
    body: row.body,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return { success: true, events, unreadCount, notifications };
}

export async function markNotificationsReadAction(): Promise<{
  success: boolean;
}> {
  try {
    const { supabase, user } = await requirePlatformAdmin();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("platform_admin_notifications")
      .update({ read_at: now })
      .eq("recipient_user_id", user.id)
      .is("read_at", null);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
