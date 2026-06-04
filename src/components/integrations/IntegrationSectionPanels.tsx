import { ActivateFirstPrompt } from "@/components/integrations/ActivateFirstPrompt";
import { ChannelAiPanel } from "@/components/channel-workspace/ChannelAiPanel";
import { ChannelAnalyticsPanel } from "@/components/channel-workspace/ChannelAnalyticsPanel";
import { ChannelWorkspacePreview } from "@/components/channel-workspace/ChannelWorkspacePreview";
import { IntegrationQuickLinks } from "@/components/integrations/IntegrationQuickLinks";
import { InstagramActivatePanel } from "@/components/instagram/InstagramActivatePanel";
import { TelegramActivatePanel } from "@/components/telegram/TelegramActivatePanel";
import { WebsiteFormsActivatePanel } from "@/components/website-forms/WebsiteFormsActivatePanel";
import { WebsiteKnowledgeActivatePanel } from "@/components/website-knowledge/WebsiteKnowledgeActivatePanel";
import { WhatsAppIntegrationPanel } from "@/components/whatsapp/WhatsAppIntegrationPanel";
import Link from "next/link";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  INTEGRATIONS_MESSAGES,
  isChannelConnectedForWorkspace,
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
  type IntegrationChannelStatusMap,
  type IntegrationSectionId,
} from "@/features/integrations";
import { WEBSITE_KNOWLEDGE_MESSAGES } from "@/features/website-knowledge";
import type {
  ChannelAiSettingsData,
  ChannelAnalyticsData,
  ChannelWorkspaceSummary,
} from "@/types/channel-workspace.types";
import type {
  InstagramConnectionData,
  InstagramEmbeddedSignupConfig,
} from "@/types/instagram.types";
import type {
  TelegramConnectConfig,
  TelegramConnectionData,
} from "@/types/telegram.types";
import type {
  WebsiteFormConnectConfig,
  WebsiteFormConnectionData,
} from "@/types/website-forms.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";
import type {
  WhatsAppConnectionData,
  WhatsAppConnectConfig,
} from "@/types/whatsapp.types";

type IntegrationSectionPanelsProps = {
  channel: IntegrationChannelId;
  section: IntegrationSectionId;
  hasBusiness: boolean;
  channelStatuses: IntegrationChannelStatusMap;
  workspaceSummary?: ChannelWorkspaceSummary;
  aiSettings?: ChannelAiSettingsData | null;
  analytics?: ChannelAnalyticsData | null;
  whatsapp?: {
    connection: WhatsAppConnectionData | null;
    connectConfig: WhatsAppConnectConfig;
  };
  instagram?: {
    connection: InstagramConnectionData | null;
    embeddedSignupConfig: InstagramEmbeddedSignupConfig;
  };
  telegram?: {
    connection: TelegramConnectionData | null;
    connectConfig: TelegramConnectConfig;
  };
  websiteForms?: {
    connection: WebsiteFormConnectionData | null;
    connectConfig: WebsiteFormConnectConfig;
  };
  websiteKnowledge?: {
    sync: WebsiteKnowledgeSyncData | null;
    geminiConfigured: boolean;
  };
};

export function IntegrationSectionPanels({
  channel,
  section,
  hasBusiness,
  channelStatuses,
  workspaceSummary,
  aiSettings,
  analytics,
  whatsapp,
  instagram,
  telegram,
  websiteForms,
  websiteKnowledge,
}: IntegrationSectionPanelsProps) {
  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);
  const isMessagingChannel = isMessagingIntegrationChannel(channel);

  if (section === "activate") {
    return (
      <ActivateSection
        channel={channel}
        hasBusiness={hasBusiness}
        whatsapp={whatsapp}
        instagram={instagram}
        telegram={telegram}
        websiteForms={websiteForms}
        websiteKnowledge={websiteKnowledge}
      />
    );
  }

  if (!isMessagingChannel) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WEBSITE_KNOWLEDGE_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>{WEBSITE_KNOWLEDGE_MESSAGES.aiUsageNote}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`${DASHBOARD_ROUTES.integrations}/website_knowledge?section=activate`}>
              Open setup
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={DASHBOARD_ROUTES.knowledgeBase}>Knowledge base</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return <ActivateFirstPrompt channel={channel} />;
  }

  const summary = workspaceSummary ?? {
    contactsCount: 0,
    aiEnabled: false,
    totalMessages: 0,
  };

  if (section === "contacts") {
    return (
      <WorkspaceLinkSection channel={channel} kind="contacts" summary={summary} />
    );
  }

  if (section === "ai-assistant") {
    if (aiSettings) {
      return (
        <div className="space-y-4">
          <ChannelAiPanel data={aiSettings} />
          <IntegrationQuickLinks channel={channel} showHubSections={false} />
        </div>
      );
    }

    return (
      <WorkspaceLinkSection
        channel={channel}
        kind="ai-assistant"
        summary={summary}
      />
    );
  }

  if (analytics) {
    return (
      <div className="space-y-4">
        <ChannelAnalyticsPanel data={analytics} />
        <IntegrationQuickLinks channel={channel} showHubSections={false} />
      </div>
    );
  }

  return (
    <WorkspaceLinkSection channel={channel} kind="analytics" summary={summary} />
  );
}

function ActivateSection({
  channel,
  hasBusiness,
  whatsapp,
  instagram,
  telegram,
  websiteForms,
  websiteKnowledge,
}: {
  channel: IntegrationChannelId;
  hasBusiness: boolean;
  whatsapp?: IntegrationSectionPanelsProps["whatsapp"];
  instagram?: IntegrationSectionPanelsProps["instagram"];
  telegram?: IntegrationSectionPanelsProps["telegram"];
  websiteForms?: IntegrationSectionPanelsProps["websiteForms"];
  websiteKnowledge?: IntegrationSectionPanelsProps["websiteKnowledge"];
}) {
  if (channel === "whatsapp" && whatsapp) {
    return (
      <WhatsAppIntegrationPanel
        connection={whatsapp.connection}
        hasBusiness={hasBusiness}
        connectConfig={whatsapp.connectConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "instagram" && instagram) {
    return (
      <InstagramActivatePanel
        connection={instagram.connection}
        hasBusiness={hasBusiness}
        embeddedSignupConfig={instagram.embeddedSignupConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "telegram" && telegram) {
    return (
      <TelegramActivatePanel
        connection={telegram.connection}
        hasBusiness={hasBusiness}
        config={telegram.connectConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "website_forms" && websiteForms) {
    return (
      <WebsiteFormsActivatePanel
        connection={websiteForms.connection}
        hasBusiness={hasBusiness}
        config={websiteForms.connectConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "website_knowledge" && websiteKnowledge) {
    return (
      <WebsiteKnowledgeActivatePanel
        sync={websiteKnowledge.sync}
        hasBusiness={hasBusiness}
        geminiConfigured={websiteKnowledge.geminiConfigured}
        embeddedInHub
      />
    );
  }

  return <ComingSoonChannelPanel channel={channel} />;
}

function ComingSoonChannelPanel({ channel }: { channel: IntegrationChannelId }) {
  const label =
    channel === "instagram"
      ? "Instagram"
      : channel === "telegram"
        ? "Telegram"
        : channel === "website_forms"
          ? "Website Forms"
          : channel;

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle>{INTEGRATIONS_MESSAGES.comingSoonTitle}</CardTitle>
        <CardDescription>
          {label} — {INTEGRATIONS_MESSAGES.comingSoonDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          The integrations hub is ready. Next phases (8.3–8.7 in TASKS.md) will
          add OAuth, webhooks, and messaging for {label}.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Activate — connect account</li>
          <li>Contacts — channel contacts</li>
          <li>AI Assistant — automated replies</li>
          <li>Analytics — channel metrics</li>
        </ul>
      </CardContent>
    </Card>
  );
}

function WorkspaceLinkSection({
  channel,
  kind,
  summary,
}: {
  channel: IntegrationChannelId;
  kind: "contacts" | "ai-assistant" | "analytics";
  summary: ChannelWorkspaceSummary;
}) {
  return (
    <div className="space-y-4">
      <ChannelWorkspacePreview channel={channel} kind={kind} summary={summary} />
      <IntegrationQuickLinks channel={channel} showHubSections={false} />
    </div>
  );
}
