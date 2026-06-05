import { redirect } from "next/navigation";

import { ChannelWorkspacePage } from "@/components/dashboard/ChannelWorkspacePage";
import { DASHBOARD_ROUTES } from "@/constants/routes";

type ContactsPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { channel } = await searchParams;

  if (!channel) {
    redirect(`${DASHBOARD_ROUTES.contacts}?channel=whatsapp`);
  }

  return (
    <ChannelWorkspacePage
      title="Contacts"
      channelParam={channel}
      section="contacts"
    />
  );
}
