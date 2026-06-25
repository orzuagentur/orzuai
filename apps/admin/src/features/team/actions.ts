"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  canAssignRole,
  canChangeRole,
  canManageTeam,
  canRemoveMember,
} from "@/features/team/permissions";
import type {
  PlatformAdminAuditEntry,
  PlatformAdminMember,
  PlatformAdminRole,
} from "@/features/team/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

const roleSchema = z.enum(["owner", "admin", "support"]);

const addAdminSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  role: roleSchema,
});

const removeAdminSchema = z.object({
  userId: z.string().uuid(),
});

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
});

type AdminRow = {
  user_id: string;
  role: PlatformAdminRole;
  created_at: string;
  created_by: string | null;
};

type AuditRow = {
  id: string;
  target_user_id: string | null;
  target_email: string;
  action: PlatformAdminAuditEntry["action"];
  actor_email: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function isOnline(lastSignInAt: string | null | undefined): boolean {
  if (!lastSignInAt) {
    return false;
  }

  const timestamp = new Date(lastSignInAt).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < ONLINE_WINDOW_MS;
}

async function findUserIdByEmail(email: string): Promise<{
  id: string;
  email: string;
} | null> {
  const service = createServiceRoleClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );

    if (match?.id && match.email) {
      return { id: match.id, email: match.email };
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

async function fetchAuthUser(userId: string) {
  const service = createServiceRoleClient();
  const { data, error } = await service.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

async function writeTeamAudit(input: {
  targetUserId: string | null;
  targetEmail: string;
  action: PlatformAdminAuditEntry["action"];
  actorUserId: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const service = createServiceRoleClient();
  const { error } = await service.from("platform_admin_audit_log").insert({
    target_user_id: input.targetUserId,
    target_email: input.targetEmail,
    action: input.action,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function listAdminRows(): Promise<AdminRow[]> {
  const { supabase } = await requirePlatformAdmin();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id, role, created_at, created_by")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminRow[];
}

async function countOwners(excludeUserId?: string): Promise<number> {
  const rows = await listAdminRows();

  return rows.filter(
    (row) => row.role === "owner" && row.user_id !== excludeUserId,
  ).length;
}

export async function fetchTeamAction(): Promise<{
  success: true;
  members: PlatformAdminMember[];
  auditLog: PlatformAdminAuditEntry[];
  actor: { userId: string; role: PlatformAdminRole };
}> {
  const { user, role: actorRole } = await requirePlatformAdmin();
  const rows = await listAdminRows();

  const members = await Promise.all(
    rows.map(async (row) => {
      const authUser = await fetchAuthUser(row.user_id);

      return {
        userId: row.user_id,
        email: authUser.email ?? "—",
        role: row.role,
        createdAt: row.created_at,
        createdBy: row.created_by,
        lastSignInAt: authUser.last_sign_in_at ?? null,
        isOnline: isOnline(authUser.last_sign_in_at),
      } satisfies PlatformAdminMember;
    }),
  );

  const { supabase } = await requirePlatformAdmin();
  const { data: auditData, error: auditError } = await supabase
    .from("platform_admin_audit_log")
    .select(
      "id, target_user_id, target_email, action, actor_email, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (auditError) {
    throw new Error(auditError.message);
  }

  const auditLog = ((auditData ?? []) as AuditRow[]).map((row) => ({
    id: row.id,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    action: row.action,
    actorEmail: row.actor_email,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));

  return {
    success: true,
    members,
    auditLog,
    actor: { userId: user.id, role: actorRole },
  };
}

export async function addAdminAction(input: z.infer<typeof addAdminSchema>) {
  const parsed = addAdminSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, role: actorRole } = await requirePlatformAdmin();

  if (!canManageTeam(actorRole)) {
    return { success: false as const, message: "Недостаточно прав" };
  }

  if (!canAssignRole(actorRole, parsed.data.role)) {
    return {
      success: false as const,
      message: "Вы не можете назначить эту роль",
    };
  }

  const authUser = await findUserIdByEmail(parsed.data.email);

  if (!authUser) {
    return {
      success: false as const,
      message: "Пользователь с таким email не найден в auth.users",
    };
  }

  const existing = await listAdminRows();
  const alreadyAdmin = existing.some((row) => row.user_id === authUser.id);

  if (alreadyAdmin) {
    return {
      success: false as const,
      message: "Этот пользователь уже является администратором",
    };
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("platform_admins").insert({
    user_id: authUser.id,
    role: parsed.data.role,
    created_by: user.id,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  await writeTeamAudit({
    targetUserId: authUser.id,
    targetEmail: authUser.email,
    action: "added",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/team");
  return { success: true as const };
}

export async function removeAdminAction(
  input: z.infer<typeof removeAdminSchema>,
) {
  const parsed = removeAdminSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, role: actorRole } = await requirePlatformAdmin();
  const rows = await listAdminRows();
  const target = rows.find((row) => row.user_id === parsed.data.userId);

  if (!target) {
    return { success: false as const, message: "Администратор не найден" };
  }

  if (
    !canRemoveMember(actorRole, user.id, target.user_id, target.role)
  ) {
    return { success: false as const, message: "Недостаточно прав" };
  }

  if (target.role === "owner") {
    const ownersLeft = await countOwners(target.user_id);

    if (ownersLeft < 1) {
      return {
        success: false as const,
        message: "Нельзя удалить последнего Owner",
      };
    }
  }

  const authUser = await fetchAuthUser(target.user_id);
  const service = createServiceRoleClient();
  const { error } = await service
    .from("platform_admins")
    .delete()
    .eq("user_id", target.user_id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  await writeTeamAudit({
    targetUserId: target.user_id,
    targetEmail: authUser.email ?? "",
    action: "removed",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    metadata: { role: target.role },
  });

  revalidatePath("/team");
  return { success: true as const };
}

export async function updateAdminRoleAction(
  input: z.infer<typeof updateRoleSchema>,
) {
  const parsed = updateRoleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, role: actorRole } = await requirePlatformAdmin();
  const rows = await listAdminRows();
  const target = rows.find((row) => row.user_id === parsed.data.userId);

  if (!target) {
    return { success: false as const, message: "Администратор не найден" };
  }

  if (target.role === parsed.data.role) {
    return { success: true as const };
  }

  if (!canChangeRole(actorRole, target.role, parsed.data.role)) {
    return { success: false as const, message: "Недостаточно прав" };
  }

  if (target.role === "owner" && parsed.data.role !== "owner") {
    const ownersLeft = await countOwners(target.user_id);

    if (ownersLeft < 1) {
      return {
        success: false as const,
        message: "Нельзя понизить последнего Owner",
      };
    }
  }

  const authUser = await fetchAuthUser(target.user_id);
  const service = createServiceRoleClient();
  const { error } = await service
    .from("platform_admins")
    .update({ role: parsed.data.role })
    .eq("user_id", target.user_id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  await writeTeamAudit({
    targetUserId: target.user_id,
    targetEmail: authUser.email ?? "",
    action: "role_updated",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    metadata: { from: target.role, to: parsed.data.role },
  });

  revalidatePath("/team");
  return { success: true as const };
}
