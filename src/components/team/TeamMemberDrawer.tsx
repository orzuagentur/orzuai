"use client";

import {
  CalendarClockIcon,
  MailIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TEAM_MESSAGES } from "@/features/team/constants";
import {
  getAccessWindowLabel,
  isAccessWindowActive,
  roleLabel,
  TEAM_PERMISSION_LABELS,
} from "@/features/team/permissions";
import {
  TEAM_PERMISSION_KEYS,
  type TeamMemberRecord,
} from "@/features/team/types";
import { cn } from "@/lib/utils";

type TeamMemberDrawerProps = {
  member: TeamMemberRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: (member: TeamMemberRecord) => void;
  onRemove: (member: TeamMemberRecord) => void;
};

function memberInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

function roleBadgeClass(role: TeamMemberRecord["role"]): string {
  switch (role) {
    case "owner":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "admin":
      return "border-primary/30 bg-primary/10 text-primary";
    case "manager":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200";
    case "agent":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200";
    case "viewer":
      return "border-border bg-muted text-muted-foreground";
  }
}

function statusLabel(member: TeamMemberRecord): string {
  if (member.isOwner) {
    return TEAM_MESSAGES.ownerBadge;
  }

  if (member.status === "invited") {
    return TEAM_MESSAGES.invitedStatus;
  }

  if (!isAccessWindowActive(member.accessStartsAt, member.accessEndsAt)) {
    const startsInFuture =
      member.accessStartsAt && new Date(member.accessStartsAt) > new Date();
    return startsInFuture ? TEAM_MESSAGES.scheduledAccess : TEAM_MESSAGES.expiredAccess;
  }

  return TEAM_MESSAGES.active;
}

export function TeamMemberDrawer({
  member,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onRemove,
}: TeamMemberDrawerProps) {
  if (!member) {
    return null;
  }

  const enabledPermissions = TEAM_PERMISSION_KEYS.filter(
    (key) => member.permissions[key],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {memberInitials(member.email)}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">{member.email}</SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("capitalize", roleBadgeClass(member.role))}
                >
                  {roleLabel(member.role)}
                </Badge>
                <Badge variant="secondary">{statusLabel(member)}</Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{TEAM_MESSAGES.accessSchedule}</h3>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                <CalendarClockIcon className="size-4 shrink-0" />
                {getAccessWindowLabel(member.accessStartsAt, member.accessEndsAt)}
              </div>
            </section>

            {!member.isOwner ? (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">{TEAM_MESSAGES.permissionsTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {enabledPermissions.length} of {TEAM_PERMISSION_KEYS.length} areas
                    enabled
                  </p>
                </div>
                <ul className="space-y-2">
                  {TEAM_PERMISSION_KEYS.map((key) => {
                    const meta = TEAM_PERMISSION_LABELS[key];
                    const enabled = member.permissions[key];

                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5",
                          enabled ? "border-primary/20 bg-primary/5" : "opacity-60",
                        )}
                      >
                        <span>
                          <span className="block text-sm font-medium">{meta.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {meta.description}
                          </span>
                        </span>
                        <Badge variant={enabled ? "default" : "outline"}>
                          {enabled ? "On" : "Off"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheckIcon className="size-4 text-amber-600" />
                  Full workspace access
                </div>
                <p className="mt-1">
                  Owners have unrestricted access to billing, team management, and all
                  workspace areas.
                </p>
              </section>
            )}

            {member.status === "invited" ? (
              <section className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                <MailIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  Invitation saved. The member will get access once they sign in with
                  this email address.
                </p>
              </section>
            ) : null}
          </div>
        </div>

        {canManage && !member.isOwner ? (
          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onEdit(member);
              }}
            >
              <PencilIcon className="size-4" />
              {TEAM_MESSAGES.editMember}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRemove(member)}
            >
              <Trash2Icon className="size-4" />
              {TEAM_MESSAGES.removeMember}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function teamMemberInitials(email: string): string {
  return memberInitials(email);
}

export function teamMemberRoleBadgeClass(role: TeamMemberRecord["role"]): string {
  return roleBadgeClass(role);
}

export function teamMemberStatusLabel(member: TeamMemberRecord): string {
  return statusLabel(member);
}
