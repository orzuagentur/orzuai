import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { IntegrationsIndex } from "@/components/integrations/IntegrationsIndex";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";

export default function IntegrationsIndexPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={6} />}>
      <IntegrationsIndexPageContent />
    </Suspense>
  );
}

async function IntegrationsIndexPageContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const channelStatuses = business
    ? await getChannelConnectionStatuses(business.id)
    : {};

  return <IntegrationsIndex channelStatuses={channelStatuses} />;
}
