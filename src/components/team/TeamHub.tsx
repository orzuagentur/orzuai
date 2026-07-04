"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarClockIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TeamMemberDialog } from "@/components/team/TeamMemberDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  TEAM_MESSAGES,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLES,
} from "@/features/team/constants";
import {
  getAccessWindowLabel,
  isAccessWindowActive,
  roleLabel,
} from "@/features/team/permissions";
import type { TeamMemberRecord, TeamPageData } from "@/features/team/types";
import { cn } from "@/lib/utils";

type TeamHubProps = {
  data: TeamPageData;
};

function formatSeatLabel(used: number, max: number): string {
  return `${used} / ${max}`;
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

function statusBadge(member: TeamMemberRecord) {
  if (member.isOwner) {
    return (
      <Badge variant="outline" className={roleBadgeClass("owner")}>
        {TEAM_MESSAGES.ownerBadge}
      </Badge>
    );
  }

  if (member.status === "invited") {
    return <Badge variant="secondary">{TEAM_MESSAGES.invitedStatus}</Badge>;
  }

  if (!isAccessWindowActive(member.accessStartsAt, member.accessEndsAt)) {
    const startsInFuture =
      member.accessStartsAt && new Date(member.accessStartsAt) > new Date();

    return (
      <Badge variant="outline" className="border-amber-500/30 text-amber-700">
        {startsInFuture ? TEAM_MESSAGES.scheduledAccess : TEAM_MESSAGES.expiredAccess}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
      {TEAM_MESSAGES.active}
    </Badge>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof UsersIcon;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-1 text-xl tabular-nums">{value}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function TeamHub({ data }: TeamHubProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRecord | null>(null);
  const [, startTransition] = useTransition();

  const seatsAvailable = data.usedSeats < data.maxTeamSeats;

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return data.members;
    }

    return data.members.filter((member) =>
      member.email.toLowerCase().includes(normalized),
    );
  }, [data.members, query]);

  function openInviteDialog() {
    setEditingMember(null);
    setDialogOpen(true);
  }

  function openEditDialog(member: TeamMemberRecord) {
    setEditingMember(member);
    setDialogOpen(true);
  }

  function handleDialogSuccess() {
    setDialogOpen(false);
    setEditingMember(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCogIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {TEAM_MESSAGES.pageTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {TEAM_MESSAGES.pageDescription}
              </p>
            </div>
          </div>
        </div>

        {data.canManageTeam ? (
          <Button
            type="button"
            onClick={openInviteDialog}
            disabled={!seatsAvailable}
            className="shrink-0"
          >
            <PlusIcon className="size-4" />
            {TEAM_MESSAGES.inviteMember}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={TEAM_MESSAGES.seatsUsed}
          value={formatSeatLabel(data.usedSeats, data.maxTeamSeats)}
          detail={`${data.planLabel} plan`}
          icon={UsersIcon}
        />
        <MetricCard
          title={TEAM_MESSAGES.activeMembers}
          value={String(data.activeMembers)}
          detail="Members with current access"
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title={TEAM_MESSAGES.pendingInvites}
          value={String(data.pendingInvites)}
          detail="Waiting to accept invitation"
          icon={MailIcon}
        />
        <MetricCard
          title="Available seats"
          value={String(Math.max(0, data.maxTeamSeats - data.usedSeats))}
          detail={
            seatsAvailable
              ? "You can invite more teammates"
              : "Upgrade billing to add seats"
          }
          icon={UserCogIcon}
        />
      </div>

      {!seatsAvailable ? (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-none">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{TEAM_MESSAGES.seatLimitReached}</p>
              <p className="text-sm text-muted-foreground">
                Your current plan includes {data.maxTeamSeats} seat
                {data.maxTeamSeats === 1 ? "" : "s"}.
              </p>
            </div>
            <Button type="button" variant="outline" asChild>
              <Link href={DASHBOARD_ROUTES.subscription}>
                Open Billing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <Card className="shadow-none">
          <CardHeader className="gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription>
                Manage roles, permissions, and access schedules.
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={TEAM_MESSAGES.searchPlaceholder}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredMembers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {query.trim() ? TEAM_MESSAGES.noResults : TEAM_MESSAGES.empty}
              </div>
            ) : (
              <ul className="divide-y">
                {filteredMembers.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{member.email}</p>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", roleBadgeClass(member.role))}
                        >
                          {roleLabel(member.role)}
                        </Badge>
                        {statusBadge(member)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClockIcon className="size-3.5" />
                          {getAccessWindowLabel(
                            member.accessStartsAt,
                            member.accessEndsAt,
                          )}
                        </span>
                        {!member.isOwner ? (
                          <span>
                            {Object.values(member.permissions).filter(Boolean).length}{" "}
                            permissions enabled
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {data.canManageTeam && !member.isOwner ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                        >
                          <PencilIcon className="size-3.5" />
                          {TEAM_MESSAGES.editMember}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Role guide</CardTitle>
            <CardDescription>
              Pick a role first, then fine-tune permissions if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEAM_ROLES.map((role) => (
              <div
                key={role.id}
                className="rounded-lg border px-3 py-2.5"
              >
                <p className="text-sm font-medium">{role.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TEAM_ROLE_DESCRIPTIONS[role.id]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TeamMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        canManage={data.canManageTeam}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
