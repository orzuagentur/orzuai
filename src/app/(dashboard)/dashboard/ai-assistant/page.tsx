import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AiAssistantHub } from "@/components/ai-assistant/AiAssistantHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
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

  return (
    <Suspense fallback={<AiAssistantFallback />}>
      <AiAssistantHub data={data} />
    </Suspense>
  );
}

function AiAssistantFallback() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="h-14 shrink-0 animate-pulse border-b bg-muted/20" />
      <div className="min-h-0 flex-1 animate-pulse bg-muted/5" />
    </div>
  );
}
