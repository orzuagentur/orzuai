import { Suspense } from "react";

import { ContactPipelineBoard } from "@/components/contacts/ContactPipelineBoard";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { UnifiedContactsPanel } from "@/components/contacts/UnifiedContactsPanel";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getContactPipeline,
  getUnifiedContacts,
} from "@/services/contacts.service";

type ContactsPageProps = {
  searchParams: Promise<{ channel?: string; segment?: string; view?: string }>;
};

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <ContactsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactsPageContent({ searchParams }: ContactsPageProps) {
  const { channel, segment, view } = await searchParams;
  const data = await getUnifiedContacts(channel, segment, view);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={CONTACTS_MESSAGES.pageTitle}
        description={CONTACTS_MESSAGES.pageDescription}
      />
    );
  }

  if (data.activeView === "pipeline") {
    const pipeline = await getContactPipeline(channel);

    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <UnifiedContactsPanel {...data} />
        <ContactPipelineBoard {...pipeline} />
      </div>
    );
  }

  return <UnifiedContactsPanel {...data} />;
}
