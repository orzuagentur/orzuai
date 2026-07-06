import Link from "next/link";

import { ChannelAnalyticsPanel } from "@/components/channel-workspace/ChannelAnalyticsPanel";
import { ChannelContactsPanel } from "@/components/channel-workspace/ChannelContactsPanel";
import { ChannelWorkspaceBanner } from "@/components/integrations/ChannelWorkspaceBanner";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHANNEL_WORKSPACE_MESSAGES } from "@/features/channel-workspace";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
  isIntegrationChannelId,
  isMessagingIntegrationChannel,
} from "@/features/integrations";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getChannelAnalytics,
  getChannelConnectionStatuses,
  getChannelContacts,
  isChannelWorkspaceReady,
} from "@/services/channel-workspace.service";

type ChannelWorkspacePageProps = {
  title: string;
  channelParam?: string | null;
  section: "contacts" | "ai-assistant" | "analytics";
};

export async function ChannelWorkspacePage({
  title,
  channelParam,
  section,
}: ChannelWorkspacePageProps) {
  if (!channelParam || !isIntegrationChannelId(channelParam)) {
    return (
      <DashboardSetupPrompt
        title={title}
        description="Select a channel to view contacts for WhatsApp, Instagram, Telegram, or Website Forms."
      />
    );
  }

  if (!isMessagingIntegrationChannel(channelParam)) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>Website Knowledge</CardTitle>
            <CardDescription>
              Manage website knowledge sync from Integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link
                href={DASHBOARD_ROUTES.aiAssistantKnowledgeWebsite}
              >
                Open Website Knowledge
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const channel = channelParam;
  const channelLabel =
    INTEGRATION_CHANNEL_LIST.find((c) => c.id === channel)?.label ?? channel;
  const pageTitle = `${title} — ${channelLabel}`;

  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business) {
    return <DashboardSetupPrompt title={pageTitle} />;
  }

  const isReady = await isChannelWorkspaceReady(business.id, channel);

  if (!isReady) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ChannelWorkspaceBanner channel={channel} />
        <Card className="max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>Channel not connected</CardTitle>
            <CardDescription>
              {CHANNEL_WORKSPACE_MESSAGES.notConnectedHint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={buildIntegrationActivateHref(channel)}>
                Go to Activate
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statuses = await getChannelConnectionStatuses(business.id);

  if (section === "contacts") {
    const data = await getChannelContacts(channel);
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <ChannelWorkspaceBanner channel={channel} />
        <ChannelContactsPanel data={data} />
      </div>
    );
  }

  if (section === "ai-assistant") {
    const { redirect } = await import("next/navigation");
    const { buildIntegrationAiSettingsHref } = await import(
      "@/features/integrations"
    );
    redirect(buildIntegrationAiSettingsHref(channel));
  }

  const data = await getChannelAnalytics(channel);
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <ChannelWorkspaceBanner channel={channel} />
      <p className="text-sm text-muted-foreground">
        Status: {statuses[channel]?.status ?? "unknown"}
      </p>
      <ChannelAnalyticsPanel data={data} />
    </div>
  );
}
