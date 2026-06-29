import { SmsInboxPanel } from "@/components/sms/SmsInboxPanel";
import { resolveInboxBusinessContext } from "@/services/chat.service";
import { getSmsInboxPageData } from "@/services/sms-inbox.service";

type SmsInboxPageProps = {
  searchParams: Promise<{ conversation?: string; phone?: string }>;
};

export default async function SmsInboxPage({ searchParams }: SmsInboxPageProps) {
  const { conversation, phone } = await searchParams;
  const inboxContext = await resolveInboxBusinessContext();
  const data = await getSmsInboxPageData(
    inboxContext,
    conversation?.trim() || null,
    phone?.trim() || null,
  );

  return (
    <SmsInboxPanel
      hasBusiness={data.hasBusiness}
      businessId={data.businessId}
      smsInboxEnabled={data.smsInboxEnabled}
      voiceInboxEnabled={data.voiceInboxEnabled}
      visibleChannelIds={data.visibleChannelIds}
      conversations={data.conversations}
      activeConversation={data.activeConversation}
    />
  );
}
