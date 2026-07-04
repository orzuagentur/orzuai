import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { TeamHub } from "@/components/team/TeamHub";
import { TEAM_MESSAGES } from "@/features/team/constants";
import { getTeamPageData } from "@/services/team.service";

export default function TeamPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={3} />}>
      <TeamPageContent />
    </Suspense>
  );
}

async function TeamPageContent() {
  const data = await getTeamPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={TEAM_MESSAGES.pageTitle}
        description="Create your business profile to invite managers and assign workspace permissions."
      />
    );
  }

  return <TeamHub data={data} />;
}
