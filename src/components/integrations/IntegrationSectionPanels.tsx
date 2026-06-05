import { ActivateFirstPrompt } from "@/components/integrations/ActivateFirstPrompt";
import { IntegrationQuickLinks } from "@/components/integrations/IntegrationQuickLinks";
import { InstagramActivatePanel } from "@/components/instagram/InstagramActivatePanel";
import { TelegramActivatePanel } from "@/components/telegram/TelegramActivatePanel";
import { WebsiteFormsActivatePanel } from "@/components/website-forms/WebsiteFormsActivatePanel";
import { WhatsAppIntegrationPanel } from "@/components/whatsapp/WhatsAppIntegrationPanel";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  INTEGRATIONS_MESSAGES,
  isChannelConnectedForWorkspace,
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
  type IntegrationChannelStatusMap,
  type IntegrationSectionId,
} from "@/features/integrations";
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
import type {
  WhatsAppConnectionData,
  WhatsAppConnectConfig,
} from "@/types/whatsapp.types";

type IntegrationSectionPanelsProps = {
  channel: IntegrationChannelId;
  section: IntegrationSectionId;
  hasBusiness: boolean;
  channelStatuses: IntegrationChannelStatusMap;
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
};

export function IntegrationSectionPanels({
  channel,
  section,
  hasBusiness,
  channelStatuses,
  whatsapp,
  instagram,
  telegram,
  websiteForms,
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
      />
    );
  }

  if (!isMessagingChannel) {
    return null;
  }

  if (!isConnected) {
    return <ActivateFirstPrompt channel={channel} />;
  }

  return <IntegrationQuickLinks channel={channel} />;
}

function ActivateSection({
  channel,
  hasBusiness,
  whatsapp,
  instagram,
  telegram,
  websiteForms,
}: {
  channel: IntegrationChannelId;
  hasBusiness: boolean;
  whatsapp?: IntegrationSectionPanelsProps["whatsapp"];
  instagram?: IntegrationSectionPanelsProps["instagram"];
  telegram?: IntegrationSectionPanelsProps["telegram"];
  websiteForms?: IntegrationSectionPanelsProps["websiteForms"];
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
          <li>AI Assistant and Analytics — sidebar workspace pages</li>
        </ul>
      </CardContent>
    </Card>
  );
}
