import { Suspense } from "react";

import { AiAssistantShell } from "@/components/ai-assistant/AiAssistantShell";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getAiAssistantPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AI_ASSISTANT_MESSAGES.singleAgentTitle}
        description={AI_ASSISTANT_MESSAGES.pageDescription}
      />
    );
  }

  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AiAssistantShell data={data}>{children}</AiAssistantShell>
    </Suspense>
  );
}
