import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IntegrationSectionPanels } from "@/components/integrations/IntegrationSectionPanels";
import { IntegrationsHub } from "@/components/integrations/IntegrationsHub";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getInstagramConnection,
  getInstagramConnectConfig,
} from "@/services/instagram.service";
import {
  getTelegramConnection,
  getTelegramConnectConfig,
} from "@/services/telegram.service";
import {
  getWebsiteFormConnection,
  getWebsiteFormConnectConfig,
} from "@/services/website-forms.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";
import { hasGeminiEnv } from "@/lib/env";
import {
  getWhatsAppConnection,
  getWhatsAppConnectConfig,
} from "@/services/whatsapp.service";
import {
  buildIntegrationChannelStatuses,
  DEFAULT_INTEGRATION_SECTION,
  isChannelConnectedForWorkspace,
  isIntegrationChannelId,
  isIntegrationSectionId,
  isMessagingIntegrationChannel,
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
    whatsappConnectConfig,
    instagramConnection,
    instagramConnectConfig,
    telegramConnection,
    telegramConfig,
    websiteFormConnection,
    websiteFormConfig,
    websiteKnowledgeSync,
  ] = await Promise.all([
    business ? getWhatsAppConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getWhatsAppConnectConfig()),
    business ? getInstagramConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getInstagramConnectConfig()),
    business ? getTelegramConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getTelegramConnectConfig()),
    business ? getWebsiteFormConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getWebsiteFormConnectConfig()),
    business ? getWebsiteKnowledgeSync(business.id) : Promise.resolve(null),
  ]);

  const channelStatuses = buildIntegrationChannelStatuses({
    whatsappConnection,
    instagramConnection,
    telegramConnection,
    websiteFormConnection,
    websiteKnowledgeSync,
  });

  const isMessagingChannel = isMessagingIntegrationChannel(channel);
  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);

  const workspaceSummary =
    business && isConnected && isMessagingChannel
      ? await getChannelWorkspaceSummary(business.id, channel)
      : undefined;

  const [aiSettings, analytics] =
    business && isConnected && isMessagingChannel
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
            connectConfig: whatsappConnectConfig,
          }}
          instagram={{
            connection: instagramConnection,
            connectConfig: instagramConnectConfig,
          }}
          telegram={{
            connection: telegramConnection,
            connectConfig: telegramConfig,
          }}
          websiteForms={{
            connection: websiteFormConnection,
            connectConfig: websiteFormConfig,
          }}
          websiteKnowledge={{
            sync: websiteKnowledgeSync,
            geminiConfigured: hasGeminiEnv(),
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
