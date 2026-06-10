import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  BrainIcon,
  BriefcaseIcon,
  CalendarIcon,
  GlobeIcon,
  HeadphonesIcon,
  HeartHandshakeIcon,
  LightbulbIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  RocketIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  UsersIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";

export const AGENT_ICON_IDS = [
  "bot",
  "sparkles",
  "target",
  "headphones",
  "calendar",
  "wrench",
  "message",
  "handshake",
  "shopping",
  "shield",
  "zap",
  "brain",
  "rocket",
  "star",
  "globe",
  "phone",
  "mail",
  "users",
  "briefcase",
  "lightbulb",
] as const;

export type AgentIconId = (typeof AGENT_ICON_IDS)[number];

export const DEFAULT_AGENT_ICON: AgentIconId = "bot";

export type AgentIconDefinition = {
  id: AgentIconId;
  label: string;
  icon: LucideIcon;
};

export const AGENT_ICONS: AgentIconDefinition[] = [
  { id: "bot", label: "Assistant", icon: BotIcon },
  { id: "sparkles", label: "AI", icon: SparklesIcon },
  { id: "target", label: "Sales", icon: TargetIcon },
  { id: "headphones", label: "Support", icon: HeadphonesIcon },
  { id: "calendar", label: "Booking", icon: CalendarIcon },
  { id: "wrench", label: "Custom", icon: WrenchIcon },
  { id: "message", label: "Chat", icon: MessageCircleIcon },
  { id: "handshake", label: "Care", icon: HeartHandshakeIcon },
  { id: "shopping", label: "Shop", icon: ShoppingBagIcon },
  { id: "shield", label: "Trust", icon: ShieldCheckIcon },
  { id: "zap", label: "Fast", icon: ZapIcon },
  { id: "brain", label: "Smart", icon: BrainIcon },
  { id: "rocket", label: "Growth", icon: RocketIcon },
  { id: "star", label: "Premium", icon: StarIcon },
  { id: "globe", label: "Global", icon: GlobeIcon },
  { id: "phone", label: "Calls", icon: PhoneIcon },
  { id: "mail", label: "Inbox", icon: MailIcon },
  { id: "users", label: "Team", icon: UsersIcon },
  { id: "briefcase", label: "Business", icon: BriefcaseIcon },
  { id: "lightbulb", label: "Ideas", icon: LightbulbIcon },
];

const iconById = new Map(AGENT_ICONS.map((entry) => [entry.id, entry]));

export function isAgentIconId(value: string): value is AgentIconId {
  return AGENT_ICON_IDS.includes(value as AgentIconId);
}

export function resolveAgentIconId(value: string | null | undefined): AgentIconId {
  if (value && isAgentIconId(value)) {
    return value;
  }

  return DEFAULT_AGENT_ICON;
}

export function getAgentIconDefinition(
  iconId: string | null | undefined,
): AgentIconDefinition {
  return iconById.get(resolveAgentIconId(iconId)) ?? iconById.get(DEFAULT_AGENT_ICON)!;
}

export function getAgentIconLabel(iconId: string | null | undefined): string {
  return getAgentIconDefinition(iconId).label;
}
