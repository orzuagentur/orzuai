import { Suspense } from "react";

import { AiAssistantSection } from "@/components/ai-assistant/AiAssistantSection";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantSectionPageProps = {
  searchParams: Promise<{
    channel?: string;
    assistantEdit?: string;
  }>;
};

export default function AiAssistantSectionPage({
  searchParams,
}: AiAssistantSectionPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AiAssistantSectionPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AiAssistantSectionPageContent({
  searchParams,
}: AiAssistantSectionPageProps) {
  const params = await searchParams;
  const data = await getAiAssistantPageData(params, { section: "assistant" });

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AI_ASSISTANT_MESSAGES.sectionAssistantTitle}
        description={AI_ASSISTANT_MESSAGES.pageDescription}
      />
    );
  }

  return <AiAssistantSection data={data} />;
}
