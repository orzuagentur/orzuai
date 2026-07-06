import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";
import { redirect } from "next/navigation";

export default async function AiAssistantSettingsPage() {
  const data = await getAiAssistantPageData();

  if (!data.assistantProfile) {
    redirect(DASHBOARD_ROUTES.aiAssistant);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AiAssistantPageHeader
        title="Agent settings"
        description="Configure name, prompt, permissions, schedule, and follow-up behavior."
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel="Dashboard"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
          <AiAssistantEditPanel
            profile={data.assistantProfile}
            followUpAgent={data.followUpAgent}
          />
        </div>
      </div>
    </div>
  );
}
