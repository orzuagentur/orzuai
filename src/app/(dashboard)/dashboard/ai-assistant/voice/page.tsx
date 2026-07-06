import { AiVoiceAgentPanel } from "@/components/ai-assistant/AiVoiceAgentPanel";
import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";
import { redirect } from "next/navigation";

export default async function AiAssistantVoicePage() {
  const data = await getAiAssistantPageData();

  if (!data.assistantProfile) {
    redirect(DASHBOARD_ROUTES.aiAssistant);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AiAssistantPageHeader
        title="Voice agent"
        description="Configure ElevenLabs voice replies for phone calls."
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel="Dashboard"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
          <AiVoiceAgentPanel
            profile={data.assistantProfile}
            elevenLabsConfigured={data.elevenLabsConfigured}
          />
        </div>
      </div>
    </div>
  );
}
