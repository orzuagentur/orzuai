import { Suspense } from "react";

import { AiManagerHub } from "@/components/ai-manager/AiManagerHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { AI_MANAGER_MESSAGES } from "@/features/ai-manager/constants";
import { getAiManagerPageData } from "@/services/ai-manager.service";

type AiManagerPageProps = {
  searchParams: Promise<{
    channel?: string;
  }>;
};

export default function AiManagerPage({ searchParams }: AiManagerPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={3} />}>
      <AiManagerPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AiManagerPageContent({ searchParams }: AiManagerPageProps) {
  const params = await searchParams;
  const data = await getAiManagerPageData({ channel: params.channel });

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AI_MANAGER_MESSAGES.pageTitle}
        description={AI_MANAGER_MESSAGES.setupDescription}
      />
    );
  }

  return <AiManagerHub data={data} />;
}
