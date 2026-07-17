import { AiVoiceAgentPanel } from "@/components/ai-assistant/AiVoiceAgentPanel";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";
import { redirect } from "next/navigation";

export default async function AiAssistantVoicePage() {
  const data = await getAiAssistantPageData();

  if (!data.assistantProfile) {
    redirect(DASHBOARD_ROUTES.aiAssistant);
  }

  return (
    <AiVoiceAgentPanel
      profile={data.assistantProfile}
      elevenLabsConfigured={data.elevenLabsConfigured}
    />
  );
}
