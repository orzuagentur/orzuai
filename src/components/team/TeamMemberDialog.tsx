"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  updateTeamMemberAction,
} from "@/features/team/actions/member-actions";
import {
  TEAM_MESSAGES,
  TEAM_ROLES,
} from "@/features/team/constants";
import {
  ROLE_DEFAULT_PERMISSIONS,
  TEAM_PERMISSION_LABELS,
} from "@/features/team/permissions";
import {
  TEAM_PERMISSION_KEYS,
  type TeamMemberRecord,
  type TeamPermissions,
  type TeamRole,
} from "@/features/team/types";
import { cn } from "@/lib/utils";

type TeamMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRecord | null;
  canManage: boolean;
  onSuccess: () => void;
};

const SELECT_CLASSNAME =
  "border-input bg-background text-foreground flex h-9 w-full rounded-lg border px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
}

export function TeamMemberDialog({
  open,
  onOpenChange,
  member,
  canManage,
  onSuccess,
}: TeamMemberDialogProps) {
  const isEditing = member !== null;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("manager");
  const [permissions, setPermissions] = useState<TeamPermissions>(
    ROLE_DEFAULT_PERMISSIONS.manager,
  );
  const [accessStartsAt, setAccessStartsAt] = useState("");
  const [accessEndsAt, setAccessEndsAt] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (member) {
      setEmail(member.email);
      setRole(member.role === "owner" ? "manager" : member.role);
      setPermissions(member.permissions);
      setAccessStartsAt(toDateInputValue(member.accessStartsAt));
      setAccessEndsAt(toDateInputValue(member.accessEndsAt));
      return;
    }

    setEmail("");
    setRole("manager");
    setPermissions(ROLE_DEFAULT_PERMISSIONS.manager);
    setAccessStartsAt("");
    setAccessEndsAt("");
  }, [member, open]);

  function handleRoleChange(nextRole: TeamRole) {
    setRole(nextRole);
    setPermissions(ROLE_DEFAULT_PERMISSIONS[nextRole]);
  }

  function togglePermission(key: (typeof TEAM_PERMISSION_KEYS)[number]) {
    setPermissions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleSubmit() {
    if (!canManage) {
      return;
    }

    startTransition(async () => {
      if (isEditing && member) {
        const result = await updateTeamMemberAction({
          memberId: member.id,
          role: role as "admin" | "manager" | "agent" | "viewer",
          permissions,
          accessStartsAt: fromDateInputValue(accessStartsAt),
          accessEndsAt: fromDateInputValue(accessEndsAt),
        });

        if (!result.success) {
          toast.error(result.message ?? TEAM_MESSAGES.memberUpdateFailed);
          return;
        }

        toast.success(TEAM_MESSAGES.memberUpdated);
        onSuccess();
        return;
      }

      if (!email.trim()) {
        return;
      }

      const result = await inviteTeamMemberAction({
        email,
        role: role as "admin" | "manager" | "agent" | "viewer",
        permissions,
        accessStartsAt: fromDateInputValue(accessStartsAt),
        accessEndsAt: fromDateInputValue(accessEndsAt),
      });

      if (!result.success) {
        toast.error(result.message ?? TEAM_MESSAGES.inviteFailed);
        return;
      }

      toast.success(TEAM_MESSAGES.invited);
      onSuccess();
    });
  }

  function handleRemove() {
    if (!member || !canManage) {
      return;
    }

    if (!window.confirm(TEAM_MESSAGES.removeMemberConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await removeTeamMemberAction({ memberId: member.id });

      if (!result.success) {
        toast.error(result.message ?? TEAM_MESSAGES.memberRemoveFailed);
        return;
      }

      toast.success(TEAM_MESSAGES.memberRemoved);
      onSuccess();
    });
  }

  const inviteRoles = TEAM_ROLES.filter((item) => item.id !== "owner");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? TEAM_MESSAGES.editMember : TEAM_MESSAGES.inviteMember}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update role, permissions, or access schedule for this teammate."
              : "Send an invitation with a role and optional custom permissions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="team-member-email">{TEAM_MESSAGES.inviteLabel}</Label>
              <Input
                id="team-member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={TEAM_MESSAGES.invitePlaceholder}
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              {email}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="team-member-role">{TEAM_MESSAGES.roleLabel}</Label>
            <select
              id="team-member-role"
              className={SELECT_CLASSNAME}
              value={role}
              onChange={(event) =>
                handleRoleChange(event.target.value as TeamRole)
              }
              disabled={!canManage}
            >
              {inviteRoles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{TEAM_MESSAGES.permissionsTitle}</p>
              <p className="text-xs text-muted-foreground">
                {TEAM_MESSAGES.permissionsDescription}
              </p>
            </div>
            <div className="grid gap-2">
              {TEAM_PERMISSION_KEYS.map((key) => {
                const meta = TEAM_PERMISSION_LABELS[key];
                const enabled = permissions[key];

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!canManage}
                    onClick={() => togglePermission(key)}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      enabled
                        ? "border-primary/30 bg-primary/5"
                        : "hover:bg-muted/40",
                      !canManage && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{meta.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {meta.description}
                      </span>
                    </span>
                    <Badge variant={enabled ? "default" : "outline"}>
                      {enabled ? "Allowed" : "Off"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{TEAM_MESSAGES.accessWindowTitle}</p>
              <p className="text-xs text-muted-foreground">
                {TEAM_MESSAGES.accessWindowDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team-access-starts">{TEAM_MESSAGES.accessStartsAt}</Label>
                <Input
                  id="team-access-starts"
                  type="date"
                  value={accessStartsAt}
                  onChange={(event) => setAccessStartsAt(event.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-access-ends">{TEAM_MESSAGES.accessEndsAt}</Label>
                <Input
                  id="team-access-ends"
                  type="date"
                  value={accessEndsAt}
                  onChange={(event) => setAccessEndsAt(event.target.value)}
                  disabled={!canManage}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing && canManage ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash2Icon className="size-4" />
                  {TEAM_MESSAGES.removeMember}
                </>
              )}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !canManage || (!isEditing && !email.trim())}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : isEditing ? (
                TEAM_MESSAGES.saveMember
              ) : (
                TEAM_MESSAGES.inviteButton
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
