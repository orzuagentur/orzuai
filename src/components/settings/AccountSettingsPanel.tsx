import Link from "next/link";
import { UserIcon } from "lucide-react";

import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ACCOUNT_SETTINGS_MESSAGES } from "@/features/settings/constants";
import type { DashboardUserProfile } from "@/types/dashboard.types";
import { getUserDisplayName } from "@/utils/dashboard";

type AccountSettingsPanelProps = {
  userProfile: DashboardUserProfile;
};

export function AccountSettingsPanel({
  userProfile,
}: AccountSettingsPanelProps) {
  const displayName = getUserDisplayName(
    userProfile.fullName,
    userProfile.email,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            {ACCOUNT_SETTINGS_MESSAGES.profileTitle}
          </CardTitle>
          <CardDescription>
            {ACCOUNT_SETTINGS_MESSAGES.profileDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ACCOUNT_SETTINGS_MESSAGES.nameLabel}
              </p>
              <p className="text-sm font-medium">{displayName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ACCOUNT_SETTINGS_MESSAGES.emailLabel}
              </p>
              <p className="text-sm font-medium">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {ACCOUNT_SETTINGS_MESSAGES.planLabel}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{userProfile.plan}</Badge>
              </div>
            </div>
            <Link
              href={DASHBOARD_ROUTES.subscription}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {ACCOUNT_SETTINGS_MESSAGES.openBilling}
            </Link>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}
