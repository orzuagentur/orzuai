import { ChannelContactsPanel } from "@/components/channel-workspace/ChannelContactsPanel";
import { ActivateFirstPrompt } from "@/components/integrations/ActivateFirstPrompt";
import { TelegramActivatePanel } from "@/components/telegram/TelegramActivatePanel";
import { VoiceActivatePanel } from "@/components/voice/VoiceActivatePanel";
import { VOICE_MESSAGES } from "@/features/voice/constants";
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
  TelegramConnectConfig,
  TelegramConnectionData,
} from "@/types/telegram.types";
import type {
  WebsiteFormConnectConfig,
  WebsiteFormConnectionData,
} from "@/types/website-forms.types";
import type { ChannelContactsData } from "@/types/channel-workspace.types";
import type {
  VoiceAgentSettings,
  VoiceCallLogItem,
  VoiceConnectConfig,
  VoiceConnectionData,
} from "@/types/voice-agent.types";
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
  telegram?: {
    connection: TelegramConnectionData | null;
    connectConfig: TelegramConnectConfig;
  };
  websiteForms?: {
    connection: WebsiteFormConnectionData | null;
    connectConfig: WebsiteFormConnectConfig;
  };
  voice?: {
    connection: VoiceConnectionData;
    settings: VoiceAgentSettings;
    recentCalls: VoiceCallLogItem[];
    connectConfig: VoiceConnectConfig;
  };
  channelContacts?: ChannelContactsData | null;
};

export function IntegrationSectionPanels({
  channel,
  section,
  hasBusiness,
  channelStatuses,
  whatsapp,
  telegram,
  websiteForms,
  voice,
  channelContacts,
}: IntegrationSectionPanelsProps) {
  const isConnected = isChannelConnectedForWorkspace(channel, channelStatuses);
  const isMessagingChannel = isMessagingIntegrationChannel(channel);

  if (section === "activate") {
    return (
      <ActivateSection
        channel={channel}
        hasBusiness={hasBusiness}
        whatsapp={whatsapp}
        telegram={telegram}
        websiteForms={websiteForms}
        voice={voice}
      />
    );
  }

  if (channel === "voice" && voice) {
    if (!isConnected) {
      return <ActivateFirstPrompt channel={channel} />;
    }

    return <VoiceCallsSection calls={voice.recentCalls} />;
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
  voice,
}: {
  channel: IntegrationChannelId;
  hasBusiness: boolean;
  whatsapp?: IntegrationSectionPanelsProps["whatsapp"];
  telegram?: IntegrationSectionPanelsProps["telegram"];
  websiteForms?: IntegrationSectionPanelsProps["websiteForms"];
  voice?: IntegrationSectionPanelsProps["voice"];
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

  if (channel === "voice" && voice) {
    return (
      <VoiceActivatePanel
        connection={voice.connection}
        settings={voice.settings}
        recentCalls={voice.recentCalls}
        config={voice.connectConfig}
        hasBusiness={hasBusiness}
        embeddedInHub
      />
    );
  }

  return <ComingSoonChannelPanel channel={channel} />;
}

function VoiceCallsSection({ calls }: { calls: VoiceCallLogItem[] }) {
  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle>{VOICE_MESSAGES.recentCallsTitle}</CardTitle>
        <CardDescription>{INTEGRATIONS_MESSAGES.contactsHint}</CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">{VOICE_MESSAGES.noCalls}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {calls.map((call) => (
              <li
                key={call.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  {call.direction === "outbound" ? "→" : "←"} {call.phoneNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {call.status} · {new Date(call.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ComingSoonChannelPanel({ channel }: { channel: IntegrationChannelId }) {
  const label =
    channel === "telegram"
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
          The integrations hub is ready. Next phases will add OAuth, webhooks,
          and messaging for {label}.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Settings — connect account</li>
          <li>Contacts — channel contacts</li>
        </ul>
      </CardContent>
    </Card>
  );
}
