import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { PushNotificationsPanel } from "@/components/pwa/PushNotificationsPanel";

export default function SettingsPushPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={1} />}>
      <div className="p-4 md:p-6">
        <PushNotificationsPanel layout="settings" />
      </div>
    </Suspense>
  );
}
