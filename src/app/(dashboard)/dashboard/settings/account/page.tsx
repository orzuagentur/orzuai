import { Suspense } from "react";

import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { getCurrentUser } from "@/services/auth.service";
import { getUserProfile } from "@/services/user.service";

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <AccountSettingsPageContent />
    </Suspense>
  );
}

async function AccountSettingsPageContent() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const userProfile = await getUserProfile(user);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <AccountSettingsPanel userProfile={userProfile} />
    </div>
  );
}
