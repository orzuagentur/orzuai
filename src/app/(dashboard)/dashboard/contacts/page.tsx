import { Suspense } from "react";

import { ContactRecordHub } from "@/components/contacts/ContactRecordHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { getActiveMessagingChannelIds } from "@/features/integrations";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import {
  getContactPipeline,
  getUnifiedContacts,
} from "@/services/contacts.service";
import { getCurrentUser } from "@/services/auth.service";

type ContactsPageProps = {
  searchParams: Promise<{
    channel?: string;
    segment?: string;
    view?: string;
    contact?: string;
    q?: string;
    page?: string;
  }>;
};

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <ContactsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactsPageContent({ searchParams }: ContactsPageProps) {
  const { channel, segment, view, contact, q, page } = await searchParams;
  const listData = await getUnifiedContacts({
    channel,
    segment,
    view,
    contact,
    q,
    page,
  });

  if (!listData.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={CONTACTS_MESSAGES.pageTitle}
        description={CONTACTS_MESSAGES.pageDescription}
      />
    );
  }

  const pipelineData =
    listData.activeView === "pipeline"
      ? await getContactPipeline({ channel, q })
      : null;

  const authUser = await getCurrentUser();
  const business = authUser ? await getPrimaryBusiness(authUser.id) : null;
  const channelStatuses = business
    ? await getChannelConnectionStatuses(business.id)
    : {};
  const visibleChannelIds = getActiveMessagingChannelIds(channelStatuses);

  return (
    <ContactRecordHub
      listData={listData}
      pipelineData={pipelineData}
      visibleChannelIds={visibleChannelIds}
    />
  );
}
