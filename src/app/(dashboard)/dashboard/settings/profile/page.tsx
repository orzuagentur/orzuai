import { Suspense } from "react";

import { BusinessProfilePanel } from "@/components/business/BusinessProfilePanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BUSINESS_PROFILE_MESSAGES } from "@/features/settings/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { mapBusinessToProfile } from "@/utils/business";

export default function BusinessProfilePage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <BusinessProfilePageContent />
    </Suspense>
  );
}

async function BusinessProfilePageContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {business ? (
        <BusinessProfilePanel
          business={mapBusinessToProfile(business)}
        />
      ) : (
        <DashboardSetupPrompt
          title={BUSINESS_PROFILE_MESSAGES.pageTitle}
          description="Create your business profile to upload a logo and add contact details."
        />
      )}
    </div>
  );
}
