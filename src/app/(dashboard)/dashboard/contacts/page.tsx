import { Suspense } from "react";

import { ContactRecordHub } from "@/components/contacts/ContactRecordHub";
import { ContactsRealtimeRefresh } from "@/components/contacts/ContactsRealtimeRefresh";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { getActiveMessagingChannelIds } from "@/features/integrations";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import {
  getContactPipeline,
  getLeadsContacts,
  getLeadsPipeline,
  getUnifiedContacts,
} from "@/services/contacts.service";
import { getCrmDealsPageData } from "@/services/crm-deals.service";
import { getCurrentUser } from "@/services/auth.service";
import { isSmsInboxVisible, isVoiceInboxVisible } from "@/services/voice-inbox.service";
import type { CrmEntityTab } from "@/types/contact.types";
import { CRM_ENTITY_TABS } from "@/types/contact.types";

type ContactsPageProps = {
  searchParams: Promise<{
    tab?: string;
    channel?: string;
    segment?: string;
    leadSegment?: string;
    view?: string;
    contact?: string;
    profile?: string;
    stage?: string;
    deal?: string;
    dealStatus?: string;
    q?: string;
    page?: string;
  }>;
};

function parseCrmTab(value: string | undefined): CrmEntityTab {
  if (value && CRM_ENTITY_TABS.includes(value as CrmEntityTab)) {
    return value as CrmEntityTab;
  }

  return "contacts";
}

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <ContactsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactsPageContent({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const activeTab = parseCrmTab(params.tab);
  const sharedInput = {
    channel: params.channel,
    q: params.q,
    page: params.page,
    contact: params.contact,
    profile: params.profile,
  };

  const listData =
    activeTab === "contacts"
      ? await getUnifiedContacts({
          ...sharedInput,
          segment: params.segment,
          view: params.view,
        })
      : null;

  const leadsData =
    activeTab === "leads"
      ? await getLeadsContacts({
          ...sharedInput,
          leadSegment: params.leadSegment,
          view: params.view,
        })
      : null;

  const dealsData =
    activeTab === "deals"
      ? await getCrmDealsPageData({
          ...sharedInput,
          view: params.view,
          stage: params.stage,
          dealStatus: params.dealStatus,
          deal: params.deal,
        })
      : null;

  const hasBusiness =
    listData?.hasBusiness ??
    leadsData?.hasBusiness ??
    dealsData?.hasBusiness ??
    false;

  if (!hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={CONTACTS_MESSAGES.pageTitle}
        description={CONTACTS_MESSAGES.pageDescription}
      />
    );
  }

  const pipelineData =
    activeTab === "contacts" && listData?.activeView === "pipeline"
      ? await getContactPipeline({ channel: params.channel, q: params.q })
      : null;

  const leadsPipelineData =
    activeTab === "leads" && leadsData?.activeView === "pipeline"
      ? await getLeadsPipeline({
          channel: params.channel,
          q: params.q,
          leadSegment: params.leadSegment,
        })
      : null;

  const authUser = await getCurrentUser();
  const business = authUser ? await getPrimaryBusiness(authUser.id) : null;
  const channelStatuses = business
    ? await getChannelConnectionStatuses(business.id)
    : {};
  const visibleChannelIds = getActiveMessagingChannelIds(channelStatuses);
  const [voiceInboxEnabled, smsInboxEnabled] = business
    ? await Promise.all([
        isVoiceInboxVisible(business.id),
        isSmsInboxVisible(business.id),
      ])
    : [false, false];

  return (
    <>
      {business ? <ContactsRealtimeRefresh businessId={business.id} /> : null}
      <ContactRecordHub
        activeTab={activeTab}
        listData={listData}
        leadsData={leadsData}
        dealsData={dealsData}
        pipelineData={pipelineData}
        leadsPipelineData={leadsPipelineData}
        visibleChannelIds={visibleChannelIds}
        voiceInboxEnabled={voiceInboxEnabled}
        smsInboxEnabled={smsInboxEnabled}
      />
    </>
  );
}
