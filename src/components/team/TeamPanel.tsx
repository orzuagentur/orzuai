"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { inviteTeamMemberAction } from "@/features/team/actions/invite-member";
import { TEAM_MESSAGES, TEAM_ROLES } from "@/features/team/constants";
import type { TeamMemberItem } from "@/services/team.service";

type TeamPanelProps = {
  members: TeamMemberItem[];
};

export function TeamPanel({ members }: TeamPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [isInviting, setIsInviting] = useState(false);

  async function handleInvite() {
    if (!email.trim()) {
      return;
    }

    setIsInviting(true);

    try {
      const result = await inviteTeamMemberAction({
        email,
        role: role as "admin" | "manager" | "agent" | "viewer",
      });

      if (!result.success) {
        toast.error(result.message ?? TEAM_MESSAGES.inviteFailed);
        return;
      }

      toast.success(TEAM_MESSAGES.invited);
      setEmail("");
      router.refresh();
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-5" />
          {TEAM_MESSAGES.title}
        </CardTitle>
        <CardDescription>{TEAM_MESSAGES.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="team-email">{TEAM_MESSAGES.inviteLabel}</Label>
            <Input
              id="team-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={TEAM_MESSAGES.invitePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-role">{TEAM_MESSAGES.roleLabel}</Label>
            <select
              id="team-role"
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {TEAM_ROLES.filter((item) => item.id !== "owner").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="button" disabled={isInviting || !email.trim()} onClick={handleInvite}>
          {isInviting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            TEAM_MESSAGES.inviteButton
          )}
        </Button>

        <ul className="divide-y rounded-lg border">
          {members.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {TEAM_MESSAGES.empty}
            </li>
          ) : (
            members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>{member.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                  <Badge variant={member.status === "active" ? "default" : "secondary"}>
                    {member.isOwner
                      ? TEAM_MESSAGES.ownerBadge
                      : member.status === "invited"
                        ? TEAM_MESSAGES.invitedStatus
                        : TEAM_MESSAGES.active}
                  </Badge>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
