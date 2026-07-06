"use client";

import { useMemo, useState, useTransition } from "react";
import {
  MailIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { TeamMemberDialog } from "@/components/team/TeamMemberDialog";
import {
  TeamMemberDrawer,
  teamMemberInitials,
  teamMemberRoleBadgeClass,
  teamMemberStatusLabel,
} from "@/components/team/TeamMemberDrawer";
import { TeamRolesPanel } from "@/components/team/TeamRolesPanel";
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
import { removeTeamMemberAction } from "@/features/team/actions/member-actions";
import { TEAM_MESSAGES } from "@/features/team/constants";
import { getAccessWindowLabel, roleLabel } from "@/features/team/permissions";
import type { TeamMemberRecord, TeamPageData } from "@/features/team/types";
import { cn } from "@/lib/utils";

type TeamHubProps = {
  data: TeamPageData;
};

type TeamTab = "members" | "roles";

function SeatProgress({ used, max }: { used: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{TEAM_MESSAGES.seatsUsed}</span>
        <span className="font-medium tabular-nums">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent >= 100 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UsersIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
      </div>
    </div>
  );
}

export function TeamHub({ data }: TeamHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TeamTab>("members");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRecord | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberRecord | null>(null);
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

  function openMemberDrawer(member: TeamMemberRecord) {
    setSelectedMember(member);
    setDrawerOpen(true);
  }

  function handleDialogSuccess() {
    setDialogOpen(false);
    setEditingMember(null);
    setDrawerOpen(false);
    setSelectedMember(null);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleRemoveMember(member: TeamMemberRecord) {
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
      setDrawerOpen(false);
      setSelectedMember(null);
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b px-4 py-4 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricPill
                label={TEAM_MESSAGES.activeMembers}
                value={String(data.activeMembers)}
                icon={ShieldCheckIcon}
              />
              <MetricPill
                label={TEAM_MESSAGES.pendingInvites}
                value={String(data.pendingInvites)}
                icon={MailIcon}
              />
              <MetricPill
                label="Plan"
                value={data.planLabel}
                icon={UsersIcon}
              />
            </div>
            <Card className="shadow-none">
              <CardContent className="pt-6">
                <SeatProgress used={data.usedSeats} max={data.maxTeamSeats} />
              </CardContent>
            </Card>
          </div>

          {!seatsAvailable ? (
            <Card className="border-amber-500/30 bg-amber-500/5 shadow-none">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{TEAM_MESSAGES.seatLimitReached}</p>
                  <p className="text-sm text-muted-foreground">
                    Your {data.planLabel} plan includes {data.maxTeamSeats} seat
                    {data.maxTeamSeats === 1 ? "" : "s"}.
                  </p>
                </div>
                <Button type="button" variant="outline" asChild>
                  <Link href={DASHBOARD_ROUTES.subscription}>Upgrade plan</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex gap-1 border-b">
            {(
              [
                { id: "members", label: "Members" },
                { id: "roles", label: "Roles & access" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "members" ? (
            <Card className="shadow-none">
              <CardHeader className="gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Team members</CardTitle>
                  <CardDescription>
                    Click a member to review permissions and access schedule.
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
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {query.trim() ? TEAM_MESSAGES.noResults : TEAM_MESSAGES.empty}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Member</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Access</th>
                          <th className="px-4 py-3 font-medium">Permissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => (
                          <tr
                            key={member.id}
                            className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
                            onClick={() => openMemberDrawer(member)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {teamMemberInitials(member.email)}
                                </div>
                                <span className="truncate font-medium">{member.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "capitalize",
                                  teamMemberRoleBadgeClass(member.role),
                                )}
                              >
                                {roleLabel(member.role)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">
                                {teamMemberStatusLabel(member)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {getAccessWindowLabel(
                                member.accessStartsAt,
                                member.accessEndsAt,
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {member.isOwner
                                ? "All areas"
                                : `${Object.values(member.permissions).filter(Boolean).length} enabled`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <TeamRolesPanel />
          )}
        </div>
      </div>

      <TeamMemberDrawer
        member={selectedMember}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        canManage={data.canManageTeam}
        onEdit={openEditDialog}
        onRemove={handleRemoveMember}
      />

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
