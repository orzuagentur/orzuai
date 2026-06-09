import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AiAssistantHub } from "@/components/ai-assistant/AiAssistantHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default function AiAssistantPage({ searchParams }: AiAssistantPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AiAssistantPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AiAssistantPageContent({ searchParams }: AiAssistantPageProps) {
  const { channel } = await searchParams;

  if (
    channel &&
    !isMessagingIntegrationChannel(channel as IntegrationChannelId)
  ) {
    redirect(`${DASHBOARD_ROUTES.aiAssistant}?channel=whatsapp`);
  }

  const data = await getAiAssistantPageData(channel ?? "whatsapp");

  if (!data.hasBusiness) {
    return <DashboardSetupPrompt title="AI Assistant" />;
  }

  return <AiAssistantHub data={data} />;
}
