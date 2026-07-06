"use client";

import { CheckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLES,
} from "@/features/team/constants";
import {
  ROLE_DEFAULT_PERMISSIONS,
  TEAM_PERMISSION_LABELS,
} from "@/features/team/permissions";
import { TEAM_PERMISSION_KEYS } from "@/features/team/types";
import { cn } from "@/lib/utils";

export function TeamRolesPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TEAM_ROLES.map((role) => (
          <Card key={role.id} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{role.label}</CardTitle>
              <CardDescription>{TEAM_ROLE_DESCRIPTIONS[role.id]}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {Object.values(ROLE_DEFAULT_PERMISSIONS[role.id]).filter(Boolean).length}{" "}
                default permissions enabled
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
          <CardDescription>
            Default access by role. Customize per member when inviting or editing.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Area
                </th>
                {TEAM_ROLES.map((role) => (
                  <th
                    key={role.id}
                    className="px-3 py-3 text-center font-medium text-muted-foreground"
                  >
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM_PERMISSION_KEYS.map((key) => {
                const meta = TEAM_PERMISSION_LABELS[key];

                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </td>
                    {TEAM_ROLES.map((role) => {
                      const enabled = ROLE_DEFAULT_PERMISSIONS[role.id][key];

                      return (
                        <td key={role.id} className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded-full",
                              enabled
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {enabled ? (
                              <CheckIcon className="size-3.5" />
                            ) : (
                              <XIcon className="size-3.5" />
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p>
          <Badge variant="outline" className="mr-2">
            Tip
          </Badge>
          Start with a role preset, then toggle individual permissions for contractors,
          billing-only admins, or read-only observers.
        </p>
      </div>
    </div>
  );
}