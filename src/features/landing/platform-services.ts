import type { LucideIcon } from "lucide-react";
import {
  BarChart3Icon,
  BotIcon,
  CalendarIcon,
  HeadphonesIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";

import type { ChannelBrandId } from "@/components/icons/channel-brand-icons";
import type { LandingLocale } from "@/features/landing/i18n";
import { getLandingCopy } from "@/features/landing/i18n";

export type PlatformServiceDefinition = {
  id: string;
  channel?: ChannelBrandId;
  Icon?: LucideIcon;
};

const PLATFORM_SERVICE_DEFINITIONS: PlatformServiceDefinition[] = [
  { id: "whatsapp", channel: "whatsapp" },
  { id: "instagram", channel: "instagram" },
  { id: "telegram", channel: "telegram" },
  { id: "voice", channel: "voice" },
  { id: "website_forms", channel: "website_forms" },
  { id: "inbox", Icon: MessageSquareIcon },
  { id: "orzu-ai", Icon: BotIcon },
  { id: "calendar", channel: "google_calendar" },
  { id: "crm", Icon: UsersIcon },
  { id: "telephony-system", Icon: HeadphonesIcon },
  { id: "analytics", Icon: BarChart3Icon },
  { id: "calendar-app", Icon: CalendarIcon },
];

export type PlatformService = PlatformServiceDefinition & {
  label: string;
  hint: string;
  liveLine: string;
};

export function getPlatformServices(locale: LandingLocale): PlatformService[] {
  const copyById = new Map(
    getLandingCopy(locale).platformServices.map((service) => [service.id, service]),
  );

  return PLATFORM_SERVICE_DEFINITIONS.flatMap((definition) => {
    const copy = copyById.get(definition.id);
    if (!copy) return [];

    return [
      {
        ...definition,
        label: copy.label,
        hint: copy.hint,
        liveLine: copy.liveLine,
      },
    ];
  });
}

export type MicroIncomingSignal = {
  channel: ChannelBrandId;
  text: string;
};

export function getMicroIncomingSignals(locale: LandingLocale): MicroIncomingSignal[] {
  return [...getLandingCopy(locale).microSignals.incoming];
}

export function getMicroVoiceLines(locale: LandingLocale): readonly string[] {
  return getLandingCopy(locale).microSignals.voiceLines;
}
