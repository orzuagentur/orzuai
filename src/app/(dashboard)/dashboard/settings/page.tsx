import { Suspense } from "react";
import Link from "next/link";
import {
  Building2Icon,
  UserCogIcon,
  UserIcon,
} from "lucide-react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { PushNotificationsPanel } from "@/components/pwa/PushNotificationsPanel";
import { CannedResponsesPanel } from "@/components/settings/CannedResponsesPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { SETTINGS_MESSAGES } from "@/features/dashboard/constants";
import {
  ACCOUNT_SETTINGS_MESSAGES,
  BUSINESS_PROFILE_MESSAGES,
} from "@/features/settings/constants";
import { TEAM_MESSAGES } from "@/features/team/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listCannedResponses } from "@/services/canned-responses.service";

const SETTINGS_LINKS = [
  {
    title: BUSINESS_PROFILE_MESSAGES.pageTitle,
    description: BUSINESS_PROFILE_MESSAGES.pageDescription,
    href: DASHBOARD_ROUTES.settingsProfile,
    icon: Building2Icon,
  },
  {
    title: ACCOUNT_SETTINGS_MESSAGES.pageTitle,
    description: ACCOUNT_SETTINGS_MESSAGES.pageDescription,
    href: DASHBOARD_ROUTES.settingsAccount,
    icon: UserIcon,
  },
  {
    title: TEAM_MESSAGES.title,
    description: TEAM_MESSAGES.manageInTeam,
    href: DASHBOARD_ROUTES.team,
    icon: UserCogIcon,
  },
] as const;

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={3} />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const cannedResponses = business ? await listCannedResponses() : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="mx-auto w-full max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {SETTINGS_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {SETTINGS_MESSAGES.pageDescription}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {SETTINGS_LINKS.map((item) => (
          <Card key={item.href} className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <item.icon className="size-4" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" asChild>
                <Link href={item.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {business ? (
        <>
          <PushNotificationsPanel />
          <div className="mx-auto w-full max-w-3xl">
            <CannedResponsesPanel initialResponses={cannedResponses} />
          </div>
        </>
      ) : null}
    </div>
  );
}
