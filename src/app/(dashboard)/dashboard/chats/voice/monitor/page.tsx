import { VoiceCallMonitorPanel } from "@/components/voice/VoiceCallMonitorPanel";
import { resolveInboxBusinessContext } from "@/services/chat.service";
import { getVoiceInboxPageData } from "@/services/voice-inbox.service";

type VoiceMonitorPageProps = {
  searchParams: Promise<{ call?: string }>;
};

export default async function VoiceMonitorPage({
  searchParams,
}: VoiceMonitorPageProps) {
  const { call: callId } = await searchParams;
  const inboxContext = await resolveInboxBusinessContext();
  const data = await getVoiceInboxPageData(inboxContext, callId?.trim() || null);

  return (
    <VoiceCallMonitorPanel
      hasBusiness={data.hasBusiness}
      businessId={data.businessId}
      voiceInboxEnabled={data.voiceInboxEnabled}
      calls={data.calls}
      activeCall={data.activeCall}
    />
  );
}
