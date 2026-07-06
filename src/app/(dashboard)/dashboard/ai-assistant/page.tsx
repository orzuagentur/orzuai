import { redirect } from "next/navigation";

import { AiAssistantDashboardClient } from "@/components/ai-assistant/AiAssistantDashboardClient";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type AiAssistantPageProps = {
  searchParams: Promise<{
    channel?: string;
    assistantEdit?: string;
    tab?: string;
    q?: string;
    category?: string;
  }>;
};

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
  const params = await searchParams;

  if (params.tab === "knowledge") {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    const suffix = query.toString();
    redirect(
      suffix
        ? `${DASHBOARD_ROUTES.aiAssistantKnowledge}?${suffix}`
        : DASHBOARD_ROUTES.aiAssistantKnowledge,
    );
  }

  if (params.tab === "channels") {
    redirect(DASHBOARD_ROUTES.aiAssistantChannels);
  }

  if (params.assistantEdit === "1" || params.tab === "settings") {
    redirect(DASHBOARD_ROUTES.aiAssistantSettings);
  }

  const data = await getAiAssistantPageData(params);

  return <AiAssistantDashboardClient data={data} />;
}
