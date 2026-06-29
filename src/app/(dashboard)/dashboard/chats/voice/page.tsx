import { VoiceCallsPanel } from "@/components/voice/VoiceCallsPanel";
import { resolveInboxBusinessContext } from "@/services/chat.service";
import { getVoiceInboxPageData } from "@/services/voice-inbox.service";

type VoiceInboxPageProps = {
  searchParams: Promise<{ call?: string; phone?: string }>;
};

export default async function VoiceInboxPage({ searchParams }: VoiceInboxPageProps) {
  const { call: callId } = await searchParams;
  const inboxContext = await resolveInboxBusinessContext();
  const data = await getVoiceInboxPageData(inboxContext, callId?.trim() || null);

  return (
    <VoiceCallsPanel
      hasBusiness={data.hasBusiness}
      businessId={data.businessId}
      voiceInboxEnabled={data.voiceInboxEnabled}
      smsInboxEnabled={data.smsInboxEnabled}
      softphoneEnabled={data.softphoneEnabled}
      visibleChannelIds={data.visibleChannelIds}
      calls={data.calls}
      activeCall={data.activeCall}
    />
  );
}
