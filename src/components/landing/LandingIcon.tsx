"use client";

import {
  BarChart3Icon,
  BookOpenIcon,
  BotIcon,
  Building2Icon,
  CalendarCheckIcon,
  Code2Icon,
  FileTextIcon,
  InboxIcon,
  LockKeyholeIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  PhoneCallIcon,
  RouteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  UsersRoundIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

import type { LandingIconKey } from "@/features/landing/i18n";

export const LANDING_ICON_MAP: Record<LandingIconKey, LucideIcon> = {
  ai: BotIcon,
  analytics: BarChart3Icon,
  api: Code2Icon,
  automations: WorkflowIcon,
  calendar: CalendarCheckIcon,
  chat: MessageSquareTextIcon,
  company: Building2Icon,
  crm: UsersRoundIcon,
  docs: BookOpenIcon,
  enterprise: ShieldCheckIcon,
  guardrails: RouteIcon,
  inbox: InboxIcon,
  integrations: NetworkIcon,
  phone: PhoneCallIcon,
  pricing: TagsIcon,
  resources: FileTextIcon,
  security: LockKeyholeIcon,
  spark: SparklesIcon,
  users: UsersRoundIcon,
  workflow: WorkflowIcon,
};

export function LandingIcon({
  icon,
  className,
}: {
  icon: LandingIconKey;
  className?: string;
}) {
  const Icon = LANDING_ICON_MAP[icon];

  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
