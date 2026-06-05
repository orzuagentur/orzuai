import Link from "next/link";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AiStatusCard } from "@/components/dashboard/AiStatusCard";
import { AnalyticsCardsGrid } from "@/components/dashboard/AnalyticsCardsGrid";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { WhatsAppStatusCard } from "@/components/dashboard/WhatsAppStatusCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { OVERVIEW_MESSAGES } from "@/features/dashboard/constants";
import { getDashboardOverview } from "@/services/analytics.service";
import { getUserDisplayName } from "@/utils/dashboard";
import { getCurrentUser } from "@/services/auth.service";
import { getUserProfile } from "@/services/user.service";

export default async function DashboardPage() {
  const [authUser, overview] = await Promise.all([
    getCurrentUser(),
    getDashboardOverview(),
  ]);

  const userProfile = authUser ? await getUserProfile(authUser) : null;
  const displayName = userProfile
    ? getUserDisplayName(userProfile.fullName, userProfile.email)
    : "there";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {OVERVIEW_MESSAGES.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {displayName}. {OVERVIEW_MESSAGES.description}
        </p>
      </div>

      {!overview.hasBusiness ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{OVERVIEW_MESSAGES.emptyBusinessTitle}</CardTitle>
            <CardDescription>
              {OVERVIEW_MESSAGES.emptyBusinessDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <AnalyticsCardsGrid metrics={overview.metrics} />

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ActivityChart data={overview.activity} />
            </div>
            <QuickActions />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RecentConversations conversations={overview.recentConversations} />
            <div className="grid gap-4">
              <WhatsAppStatusCard
                status={overview.whatsappStatus}
                phoneNumber={overview.whatsappPhoneNumber}
              />
              <AiStatusCard aiEnabled={overview.aiEnabled} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
