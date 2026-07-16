import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";
import { redirect } from "next/navigation";

export default async function AiAssistantSettingsPage() {
  const data = await getAiAssistantPageData();

  if (!data.assistantProfile) {
    redirect(DASHBOARD_ROUTES.aiAssistant);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AiAssistantEditPanel
        profile={data.assistantProfile}
        followUpAgent={data.followUpAgent}
        workerReadiness={data.workerReadiness}
        salesAgent={data.salesAgent}
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel={AI_ASSISTANT_MESSAGES.assistantEditBack}
      />
    </div>
  );
}
