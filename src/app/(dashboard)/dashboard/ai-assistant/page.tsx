import { Suspense } from "react";

import { AiAssistantSection } from "@/components/ai-assistant/AiAssistantSection";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantPageProps = {
  searchParams: Promise<{
    channel?: string;
    assistantEdit?: string;
  }>;
};

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
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
        title={AI_ASSISTANT_MESSAGES.singleAgentTitle}
        description={AI_ASSISTANT_MESSAGES.pageDescription}
      />
    );
  }

  return <AiAssistantSection data={data} />;
}
