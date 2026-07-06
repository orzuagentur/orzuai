import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { CannedResponsesPanel } from "@/components/settings/CannedResponsesPanel";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listCannedResponses } from "@/services/canned-responses.service";

export default function SettingsQuickRepliesPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={1} />}>
      <SettingsQuickRepliesContent />
    </Suspense>
  );
}

async function SettingsQuickRepliesContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const cannedResponses = business ? await listCannedResponses() : [];

  return (
    <div className="p-4 md:p-6">
      <CannedResponsesPanel
        initialResponses={cannedResponses}
        layout="settings"
      />
    </div>
  );
}
