import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";
import {
  getVoiceAgentSettings,
  getVoiceConnection,
} from "@/services/voice-agent.service";
import { listTwilioPhoneNumbersForBusiness } from "@/services/twilio-integration.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getCurrentUser } from "@/services/auth.service";
import { redirect } from "next/navigation";

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string; setup?: string }>;
};

export default async function AiAssistantSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const data = await getAiAssistantPageData();

  if (!data.assistantProfile) {
    redirect(DASHBOARD_ROUTES.aiAssistant);
  }

  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const [voiceConnection, voiceSettings, availablePhoneNumbers] =
    await Promise.all([
      business ? getVoiceConnection(business.id) : Promise.resolve(null),
      business ? getVoiceAgentSettings(business.id) : Promise.resolve(null),
      business
        ? listTwilioPhoneNumbersForBusiness(business.id)
        : Promise.resolve([]),
    ]);

  const setupMode = params.setup === "1" || params.setup === "true";

  const initialTab =
    params.tab === "voice"
      ? "voice"
      : params.tab === "activation"
        ? "activation"
        : params.tab === "sales"
          ? "sales"
          : params.tab === "schedule"
            ? "schedule"
            : params.tab === "permissions"
              ? "permissions"
              : params.tab === "data-collection"
                ? "data-collection"
                : setupMode
                  ? "behavior"
                  : "behavior";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AiAssistantEditPanel
        profile={data.assistantProfile}
        followUpAgent={data.followUpAgent}
        workerReadiness={data.workerReadiness}
        salesAgent={data.salesAgent}
        elevenLabsConfigured={data.elevenLabsConfigured}
        voiceConnection={voiceConnection}
        voiceSettings={voiceSettings}
        availablePhoneNumbers={availablePhoneNumbers}
        initialTab={initialTab}
        setupMode={setupMode}
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel={AI_ASSISTANT_MESSAGES.assistantEditBack}
      />
    </div>
  );
}
