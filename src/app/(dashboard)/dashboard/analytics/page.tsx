import { ChannelWorkspacePage } from "@/components/dashboard/ChannelWorkspacePage";

type AnalyticsPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const { channel } = await searchParams;

  return (
    <ChannelWorkspacePage
      title="Analytics"
      channelParam={channel}
      section="analytics"
    />
  );
}
