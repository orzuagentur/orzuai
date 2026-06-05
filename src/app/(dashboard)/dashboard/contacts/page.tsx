import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { UnifiedContactsPanel } from "@/components/contacts/UnifiedContactsPanel";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getUnifiedContacts } from "@/services/contacts.service";

type ContactsPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { channel } = await searchParams;
  const data = await getUnifiedContacts(channel);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={CONTACTS_MESSAGES.pageTitle}
        description={CONTACTS_MESSAGES.pageDescription}
      />
    );
  }

  return <UnifiedContactsPanel {...data} />;
}
