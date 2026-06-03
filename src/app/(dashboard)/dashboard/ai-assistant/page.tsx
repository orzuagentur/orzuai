import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AiAssistantHub } from "@/components/ai-assistant/AiAssistantHub";
import { DashboardComingSoon } from "@/components/dashboard/DashboardComingSoon";
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
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <DashboardComingSoon title="AI Assistant" />
      </div>
    );
  }

  return (
    <Suspense fallback={<AiAssistantFallback />}>
      <AiAssistantHub data={data} />
    </Suspense>
  );
}

function AiAssistantFallback() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="min-h-[32rem] animate-pulse rounded-xl border bg-muted/30" />
    </div>
  );
}
