import { Suspense } from "react";

import { BusinessSettingsPanel } from "@/components/business/BusinessSettingsPanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { PushNotificationsPanel } from "@/components/pwa/PushNotificationsPanel";
import { AiProviderKeysSettingsPanel } from "@/components/settings/AiProviderKeysSettingsPanel";
import { CannedResponsesPanel } from "@/components/settings/CannedResponsesPanel";
import { TeamPanel } from "@/components/team/TeamPanel";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getBusinessAiKeysSettings } from "@/services/business-ai-credentials.service";
import { listCannedResponses } from "@/services/canned-responses.service";
import { listTeamMembers } from "@/services/team.service";
import { mapBusinessToProfile } from "@/utils/business";

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
  const [cannedResponses, teamMembers, aiKeysSettings] = business
    ? await Promise.all([
        listCannedResponses(),
        listTeamMembers(business.id),
        getBusinessAiKeysSettings(business.id),
      ])
    : [[], [], { credentials: [], preferCustomerAiKeys: false }];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <BusinessSettingsPanel
        business={business ? mapBusinessToProfile(business) : null}
      />

      {business ? (
        <>
          <AiProviderKeysSettingsPanel settings={aiKeysSettings} />
          <TeamPanel members={teamMembers} />
          <PushNotificationsPanel />
          <div className="mx-auto w-full max-w-3xl">
            <CannedResponsesPanel initialResponses={cannedResponses} />
          </div>
        </>
      ) : null}
    </div>
  );
}
