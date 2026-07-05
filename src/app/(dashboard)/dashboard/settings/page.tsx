import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { PushNotificationsPanel } from "@/components/pwa/PushNotificationsPanel";
import { CannedResponsesPanel } from "@/components/settings/CannedResponsesPanel";
import { SETTINGS_MESSAGES } from "@/features/dashboard/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listCannedResponses } from "@/services/canned-responses.service";

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
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
