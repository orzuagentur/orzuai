import { ChannelWorkspacePage } from "@/components/dashboard/ChannelWorkspacePage";

type ContactsPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { channel } = await searchParams;

  return (
    <ChannelWorkspacePage
      title="Contacts"
      channelParam={channel}
      section="contacts"
    />
  );
}
