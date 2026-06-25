"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarIcon,
  CircleIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  canAssignRole,
  canManageTeam,
  canRemoveMember,
  roleLabel,
} from "@/features/team/permissions";
import {
  addAdminAction,
  removeAdminAction,
  updateAdminRoleAction,
} from "@/features/team/actions";
import type {
  PlatformAdminAuditEntry,
  PlatformAdminMember,
  PlatformAdminRole,
} from "@/features/team/types";

type TeamManagerProps = {
  members: PlatformAdminMember[];
  auditLog: PlatformAdminAuditEntry[];
  actor: { userId: string; role: PlatformAdminRole };
};

const ROLE_OPTIONS: PlatformAdminRole[] = ["owner", "admin", "support"];

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleBadgeClass(role: PlatformAdminRole): string {
  switch (role) {
    case "owner":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "admin":
      return "bg-primary/15 text-primary";
    case "support":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
}

export function TeamManager({ members, auditLog, actor }: TeamManagerProps) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    role: "admin" as PlatformAdminRole,
  });

  const canManage = canManageTeam(actor.role);

  const assignableRoles = ROLE_OPTIONS.filter((role) =>
    canAssignRole(actor.role, role),
  );

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return members;
    }

    return members.filter((member) =>
      member.email.toLowerCase().includes(normalized),
    );
  }, [members, query]);

  function handleAdd() {
    startTransition(async () => {
      const result = await addAdminAction(addForm);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        "message" in result && result.message
          ? result.message
          : "Администратор добавлен, приглашение отправлено на email",
      );
      setShowAddForm(false);
      setAddForm({ email: "", role: "admin" });
      window.location.reload();
    });
  }

  function handleRemove(member: PlatformAdminMember) {
    if (
      !canRemoveMember(actor.role, actor.userId, member.userId, member.role)
    ) {
      toast.error("Недостаточно прав");
      return;
    }

    if (
      !window.confirm(`Удалить администратора ${member.email} из команды?`)
    ) {
      return;
    }

    startTransition(async () => {
      const result = await removeAdminAction({ userId: member.userId });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Администратор удалён");
      window.location.reload();
    });
  }

  function handleRoleChange(member: PlatformAdminMember, role: PlatformAdminRole) {
    startTransition(async () => {
      const result = await updateAdminRoleAction({
        userId: member.userId,
        role,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Роль обновлена");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Команда</h1>
          <p className="text-sm text-muted-foreground">
            Управление администраторами платформы OrzuX
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            Add Admin
          </button>
        ) : null}
      </div>

      {showAddForm && canManage ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">Добавить администратора</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              placeholder="email@company.com"
              value={addForm.email}
              onChange={(event) =>
                setAddForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            <select
              value={addForm.role}
              onChange={(event) =>
                setAddForm((current) => ({
                  ...current,
                  role: event.target.value as PlatformAdminRole,
                }))
              }
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending || !addForm.email.trim()}
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              Добавить
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Пользователь должен уже существовать в Supabase Auth (регистрация в
            основном приложении).
          </p>
        </div>
      ) : null}

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Поиск по email..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm outline-none ring-primary/30 focus:ring-2"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Администратор</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Последний вход</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Администраторы не найдены
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const removable = canRemoveMember(
                    actor.role,
                    actor.userId,
                    member.userId,
                    member.role,
                  );
                  const isSelf = member.userId === actor.userId;

                  return (
                    <tr key={member.userId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                            <UserIcon className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{member.email}</p>
                            {isSelf ? (
                              <p className="text-xs text-muted-foreground">
                                Это вы
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.isOnline
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <CircleIcon
                            className={`size-2 ${
                              member.isOnline
                                ? "fill-emerald-500 text-emerald-500"
                                : "fill-muted-foreground text-muted-foreground"
                            }`}
                          />
                          {member.isOnline ? "Онлайн" : "Оффлайн"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon className="size-3.5" />
                          {formatDate(member.lastSignInAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {actor.role === "owner" && !isSelf ? (
                          <select
                            value={member.role}
                            disabled={isPending}
                            onChange={(event) =>
                              handleRoleChange(
                                member,
                                event.target.value as PlatformAdminRole,
                              )
                            }
                            className={`rounded-lg border bg-background px-2 py-1 text-xs font-medium ${roleBadgeClass(member.role)}`}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(member.role)}`}
                          >
                            <ShieldIcon className="size-3" />
                            {roleLabel(member.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {removable ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemove(member)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2Icon className="size-3.5" />
                            Remove
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium">Журнал изменений</h2>
        <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {auditLog.length === 0 ? (
            <p className="text-muted-foreground">Пока нет записей</p>
          ) : (
            auditLog.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-0.5 border-b pb-2 last:border-0"
              >
                <p>
                  <span className="font-medium">{entry.actorEmail}</span>{" "}
                  <span className="text-muted-foreground">
                    {entry.action === "added"
                      ? "добавил"
                      : entry.action === "removed"
                        ? "удалил"
                        : "изменил роль"}
                  </span>{" "}
                  <span className="font-medium">{entry.targetEmail}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
