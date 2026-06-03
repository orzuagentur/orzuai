import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IntegrationSectionPanels } from "@/components/integrations/IntegrationSectionPanels";
import { IntegrationsHub } from "@/components/integrations/IntegrationsHub";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getInstagramConnection,
  getInstagramEmbeddedSignupConfig,
} from "@/services/instagram.service";
import {
  getTelegramConnection,
  getTelegramConnectConfig,
} from "@/services/telegram.service";
import {
  getWhatsAppConnection,
  getWhatsAppEmbeddedSignupConfig,
} from "@/services/whatsapp.service";
import {
  buildIntegrationChannelStatuses,
  DEFAULT_INTEGRATION_SECTION,
  isChannelConnectedForWorkspace,
  isIntegrationChannelId,
  isIntegrationSectionId,
  type IntegrationChannelId,
  type IntegrationSectionId,
} from "@/features/integrations";
import {
  getChannelAiSettings,
  getChannelAnalytics,
  getChannelWorkspaceSummary,
} from "@/services/channel-workspace.service";

type IntegrationsChannelPageProps = {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ section?: string }>;
};

export default async function IntegrationsChannelPage({
  params,
  searchParams,
}: IntegrationsChannelPageProps) {
  const { channel: channelParam } = await params;
  const { section: sectionParam } = await searchParams;

  if (!isIntegrationChannelId(channelParam)) {
    notFound();
  }

  const channel: IntegrationChannelId = channelParam;
  const section: IntegrationSectionId = isIntegrationSectionId(sectionParam)
    ? sectionParam
    : DEFAULT_INTEGRATION_SECTION;

  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  const [
    whatsappConnection,
    whatsappConfig,
    instagramConnection,
    instagramConfig,
    telegramConnection,
    telegramConfig,
  ] = await Promise.all([
    business ? getWhatsAppConnection(business.id) : Promise.resolve(null),
    getWhatsAppEmbeddedSignupConfig(),
    business ? getInstagramConnection(business.id) : Promise.resolve(null),
    getInstagramEmbeddedSignupConfig(),
    business ? getTelegramConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getTelegramConnectConfig()),
  ]);

  const channelStatuses = buildIntegrationChannelStatuses({
    whatsappConnection,
    instagramConnection,
    telegramConnection,
  });

  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);

  const workspaceSummary =
    business && isConnected
      ? await getChannelWorkspaceSummary(business.id, channel)
      : undefined;

  const [aiSettings, analytics] =
    business && isConnected
      ? await Promise.all([
          section === "ai-assistant"
            ? getChannelAiSettings(channel)
            : Promise.resolve(null),
          section === "analytics"
            ? getChannelAnalytics(channel)
            : Promise.resolve(null),
        ])
      : [null, null];

  return (
    <Suspense fallback={<IntegrationsHubFallback channel={channel} />}>
      <IntegrationsHub activeChannel={channel} channelStatuses={channelStatuses}>
        <IntegrationSectionPanels
          channel={channel}
          section={section}
          hasBusiness={Boolean(business)}
          channelStatuses={channelStatuses}
          workspaceSummary={workspaceSummary}
          aiSettings={aiSettings}
          analytics={analytics}
          whatsapp={{
            connection: whatsappConnection,
            embeddedSignupConfig: whatsappConfig,
          }}
          instagram={{
            connection: instagramConnection,
            embeddedSignupConfig: instagramConfig,
          }}
          telegram={{
            connection: telegramConnection,
            connectConfig: telegramConfig,
          }}
        />
      </IntegrationsHub>
    </Suspense>
  );
}

function IntegrationsHubFallback({
  channel,
}: {
  channel: IntegrationChannelId;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="min-h-[32rem] animate-pulse rounded-xl border bg-muted/30" />
      <span className="sr-only">Loading {channel} integration</span>
    </div>
  );
}
