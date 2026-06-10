import { Suspense } from "react";

import { AiAgentsHub } from "@/components/ai-assistant/AiAgentsHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantPageProps = {
  searchParams: Promise<{
    channel?: string;
    tab?: string;
    agent?: string;
    pick?: string;
    q?: string;
    setup?: string;
    edit?: string;
  }>;
};

export default function AiAssistantPage({ searchParams }: AiAssistantPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AiAssistantPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AiAssistantPageContent({ searchParams }: AiAssistantPageProps) {
  const params = await searchParams;
  const data = await getAiAssistantPageData(params);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AI_ASSISTANT_MESSAGES.pageTitle}
        description={AI_ASSISTANT_MESSAGES.pageDescription}
      />
    );
  }

  return <AiAgentsHub data={data} />;
}
