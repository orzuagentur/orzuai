import { notFound, redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { Suspense } from "react";

import { IntegrationChannelShell } from "@/components/integrations/IntegrationChannelShell";
import { IntegrationSectionPanels } from "@/components/integrations/IntegrationSectionPanels";
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
  getWebsiteFormConnection,
  getWebsiteFormConnectConfig,
} from "@/services/website-forms.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";
import {
  getVoiceAgentSettings,
  getVoiceConnectConfig,
  getVoiceConnection,
  listRecentVoiceCalls,
} from "@/services/voice-agent.service";
import {
  getWhatsAppConnection,
  getWhatsAppEmbeddedSignupConfig,
} from "@/services/whatsapp.service";
import {
  buildChannelWorkspaceHref,
  buildIntegrationChannelStatuses,
  DEFAULT_INTEGRATION_SECTION,
  INTEGRATIONS_MESSAGES,
  isChannelActivated,
  isIntegrationChannelId,
  isIntegrationSectionId,
  isLegacyIntegrationWorkspaceSection,
  type IntegrationChannelId,
  type IntegrationSectionId,
} from "@/features/integrations";

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

  if (channelParam === "website_knowledge") {
    redirect(`${DASHBOARD_ROUTES.knowledgeBase}#website-sync`);
  }

  if (!isIntegrationChannelId(channelParam)) {
    notFound();
  }

  const channel: IntegrationChannelId = channelParam;

  if (isLegacyIntegrationWorkspaceSection(sectionParam)) {
    redirect(buildChannelWorkspaceHref(channel, sectionParam));
  }

  const section: IntegrationSectionId = isIntegrationSectionId(sectionParam)
    ? sectionParam
    : DEFAULT_INTEGRATION_SECTION;

  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  const [
    whatsappConnection,
    whatsappEmbeddedSignupConfig,
    instagramConnection,
    instagramConfig,
    telegramConnection,
    telegramConfig,
    websiteFormConnection,
    websiteFormConfig,
    websiteKnowledgeSync,
    voiceConnection,
    voiceSettings,
    voiceRecentCalls,
    voiceConnectConfig,
  ] = await Promise.all([
    business ? getWhatsAppConnection(business.id) : Promise.resolve(null),
    getWhatsAppEmbeddedSignupConfig(),
    business ? getInstagramConnection(business.id) : Promise.resolve(null),
    getInstagramEmbeddedSignupConfig(),
    business ? getTelegramConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getTelegramConnectConfig()),
    business ? getWebsiteFormConnection(business.id) : Promise.resolve(null),
    Promise.resolve(getWebsiteFormConnectConfig()),
    business ? getWebsiteKnowledgeSync(business.id) : Promise.resolve(null),
    business ? getVoiceConnection(business.id) : Promise.resolve(null),
    business
      ? getVoiceAgentSettings(business.id)
      : Promise.resolve(null),
    business ? listRecentVoiceCalls(business.id) : Promise.resolve([]),
    Promise.resolve(getVoiceConnectConfig()),
  ]);

  const channelStatuses = buildIntegrationChannelStatuses({
    whatsappConnection,
    instagramConnection,
    telegramConnection,
    websiteFormConnection,
    websiteKnowledgeSync,
    voiceConnection,
  });

  const isActivated = isChannelActivated(channel, channelStatuses);

  return (
    <Suspense fallback={<IntegrationChannelFallback channel={channel} />}>
      <IntegrationChannelShell
        activeChannel={channel}
        channelStatuses={channelStatuses}
        isActivated={isActivated}
        backHref={
          isActivated ? DASHBOARD_ROUTES.integrations : DASHBOARD_ROUTES.marketplace
        }
        backLabel={
          isActivated
            ? INTEGRATIONS_MESSAGES.backToIntegrations
            : INTEGRATIONS_MESSAGES.backToMarketplace
        }
      >
        <IntegrationSectionPanels
          channel={channel}
          section={section}
          hasBusiness={Boolean(business)}
          channelStatuses={channelStatuses}
          whatsapp={{
            connection: whatsappConnection,
            embeddedSignupConfig: whatsappEmbeddedSignupConfig,
          }}
          instagram={{
            connection: instagramConnection,
            embeddedSignupConfig: instagramConfig,
          }}
          telegram={{
            connection: telegramConnection,
            connectConfig: telegramConfig,
          }}
          websiteForms={{
            connection: websiteFormConnection,
            connectConfig: websiteFormConfig,
          }}
          voice={
            voiceConnection && voiceSettings
              ? {
                  connection: voiceConnection,
                  settings: voiceSettings,
                  recentCalls: voiceRecentCalls,
                  connectConfig: voiceConnectConfig,
                }
              : undefined
          }
        />
      </IntegrationChannelShell>
    </Suspense>
  );
}

function IntegrationChannelFallback({
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
