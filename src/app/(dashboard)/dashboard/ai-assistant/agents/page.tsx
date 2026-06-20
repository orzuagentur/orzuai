import { Suspense } from "react";

import { AiAgentsSection } from "@/components/ai-assistant/AiAgentsSection";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAgentsSectionPageProps = {
  searchParams: Promise<{
    channel?: string;
    agent?: string;
    step?: string;
    goal?: string;
    q?: string;
    setup?: string;
    edit?: string;
    analytics?: string;
  }>;
};

export default function AiAgentsSectionPage({
  searchParams,
}: AiAgentsSectionPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AiAgentsSectionPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AiAgentsSectionPageContent({
  searchParams,
}: AiAgentsSectionPageProps) {
  const params = await searchParams;
  const data = await getAiAssistantPageData(params, { section: "agents" });

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AI_ASSISTANT_MESSAGES.sectionAgentsTitle}
        description={AI_ASSISTANT_MESSAGES.pageDescription}
      />
    );
  }

  return <AiAgentsSection data={data} />;
}
