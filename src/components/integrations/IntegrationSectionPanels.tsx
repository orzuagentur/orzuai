import { ChannelContactsPanel } from "@/components/channel-workspace/ChannelContactsPanel";
import { EmailActivatePanelClient } from "@/components/email/EmailActivatePanelClient";
import { GoogleCalendarConnectPanelClient } from "@/components/google-calendar/GoogleCalendarConnectPanelClient";
import { ActivateFirstPrompt } from "@/components/integrations/ActivateFirstPrompt";
import { SmsActivatePanel } from "@/components/sms/SmsActivatePanel";
import { TelegramActivatePanel } from "@/components/telegram/TelegramActivatePanel";
import { VoiceActivatePanel } from "@/components/voice/VoiceActivatePanel";
import { WebsiteChatActivatePanel } from "@/components/website-chat/WebsiteChatActivatePanel";
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
  INTEGRATION_CHANNEL_LIST,
  INTEGRATIONS_MESSAGES,
  isChannelConnectedForWorkspace,
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
  type IntegrationChannelStatusMap,
  type IntegrationSectionId,
} from "@/features/integrations";
import type {
  TelegramConnectConfig,
  TelegramConnectionData,
} from "@/types/telegram.types";
import type {
  WebsiteFormConnectConfig,
  WebsiteFormConnectionData,
} from "@/types/website-forms.types";
import type {
  WebsiteChatConnectConfig,
  WebsiteChatConnectionData,
} from "@/types/website-chat.types";
import type {
  ChannelAiSettingsData,
  ChannelContactsData,
} from "@/types/channel-workspace.types";
import type {
  TwilioPhoneNumberOption,
} from "@/types/twilio-integration.types";
import type {
  VoiceAgentSettings,
  VoiceConnectConfig,
  VoiceConnectionData,
} from "@/types/voice-agent.types";
import type {
  WhatsAppConnectionData,
  WhatsAppConnectConfig,
} from "@/types/whatsapp.types";
import type {
  GmailConnectConfig,
  GmailConnectionData,
} from "@/types/gmail-integration.types";
import type {
  GoogleCalendarConnectConfig,
  GoogleCalendarConnectionData,
} from "@/types/google-calendar.types";

type IntegrationSectionPanelsProps = {
  channel: IntegrationChannelId;
  section: IntegrationSectionId;
  hasBusiness: boolean;
  channelStatuses: IntegrationChannelStatusMap;
  whatsapp?: {
    connection: WhatsAppConnectionData | null;
    connectConfig: WhatsAppConnectConfig;
  };
  telegram?: {
    connection: TelegramConnectionData | null;
    connectConfig: TelegramConnectConfig;
  };
  websiteForms?: {
    connection: WebsiteFormConnectionData | null;
    connectConfig: WebsiteFormConnectConfig;
  };
  websiteChat?: {
    connection: WebsiteChatConnectionData | null;
    connectConfig: WebsiteChatConnectConfig;
  };
  voice?: {
    connection: VoiceConnectionData;
    settings: VoiceAgentSettings;
    connectConfig: VoiceConnectConfig;
    availablePhoneNumbers: TwilioPhoneNumberOption[];
  };
  sms?: {
    connection: VoiceConnectionData | null;
    settings: VoiceAgentSettings | null;
  };
  googleCalendar?: {
    connection: GoogleCalendarConnectionData | null;
    connectConfig: GoogleCalendarConnectConfig;
  };
  gmail?: {
    connection: GmailConnectionData | null;
    connectConfig: GmailConnectConfig;
  };
  channelContacts?: ChannelContactsData | null;
  channelAiSettings?: ChannelAiSettingsData | null;
};

export function IntegrationSectionPanels({
  channel,
  section,
  hasBusiness,
  channelStatuses,
  whatsapp,
  telegram,
  websiteForms,
  websiteChat,
  voice,
  sms,
  googleCalendar,
  gmail,
  channelContacts,
}: IntegrationSectionPanelsProps) {
  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);
  const isMessagingChannel = isMessagingIntegrationChannel(channel);

  if (section === "activate") {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <ActivateSection
          channel={channel}
          hasBusiness={hasBusiness}
          whatsapp={whatsapp}
          telegram={telegram}
          websiteForms={websiteForms}
          websiteChat={websiteChat}
          voice={voice}
          sms={sms}
          googleCalendar={googleCalendar}
          gmail={gmail}
        />
      </div>
    );
  }

  if (!isMessagingChannel) {
    return null;
  }

  if (!isConnected) {
    return <ActivateFirstPrompt channel={channel} />;
  }

  if (channelContacts) {
    return <ChannelContactsPanel data={channelContacts} />;
  }

  return (
    <p className="text-sm text-muted-foreground">{INTEGRATIONS_MESSAGES.contactsHint}</p>
  );
}

function ActivateSection({
  channel,
  hasBusiness,
  whatsapp,
  telegram,
  websiteForms,
  websiteChat,
  voice,
  sms,
  googleCalendar,
  gmail,
}: {
  channel: IntegrationChannelId;
  hasBusiness: boolean;
  whatsapp?: IntegrationSectionPanelsProps["whatsapp"];
  telegram?: IntegrationSectionPanelsProps["telegram"];
  websiteForms?: IntegrationSectionPanelsProps["websiteForms"];
  websiteChat?: IntegrationSectionPanelsProps["websiteChat"];
  voice?: IntegrationSectionPanelsProps["voice"];
  sms?: IntegrationSectionPanelsProps["sms"];
  googleCalendar?: IntegrationSectionPanelsProps["googleCalendar"];
  gmail?: IntegrationSectionPanelsProps["gmail"];
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

  if (channel === "website_chat" && websiteChat) {
    return (
      <WebsiteChatActivatePanel
        connection={websiteChat.connection}
        hasBusiness={hasBusiness}
        config={websiteChat.connectConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "voice" && voice) {
    return (
      <VoiceActivatePanel
        connection={voice.connection}
        settings={voice.settings}
        config={voice.connectConfig}
        availablePhoneNumbers={voice.availablePhoneNumbers}
        hasBusiness={hasBusiness}
        embeddedInHub
      />
    );
  }

  if (channel === "sms" && sms) {
    return (
      <SmsActivatePanel
        connection={sms.connection}
        settings={sms.settings}
        hasBusiness={hasBusiness}
        embeddedInHub
      />
    );
  }

  if (channel === "email" && gmail) {
    return (
      <EmailActivatePanelClient
        connection={gmail.connection}
        hasBusiness={hasBusiness}
        config={gmail.connectConfig}
        embeddedInHub
      />
    );
  }

  if (channel === "google_calendar" && googleCalendar) {
    return (
      <GoogleCalendarConnectPanelClient
        connection={googleCalendar.connection}
        hasBusiness={hasBusiness}
        config={googleCalendar.connectConfig}
        embeddedInHub
      />
    );
  }

  return <ComingSoonChannelPanel channel={channel} />;
}

function ComingSoonChannelPanel({ channel }: { channel: IntegrationChannelId }) {
  const channelConfig = INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel);
  const label = channelConfig?.label ?? channel;

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
          The integrations hub is ready. {label} will be available in an upcoming
          release.
        </p>
      </CardContent>
    </Card>
  );
}
