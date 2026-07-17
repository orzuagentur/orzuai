"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";
import type { AiAgentTab } from "@/types/agent-dashboard.types";
import { getAiAssistantTabPath } from "@/utils/ai-assistant-routes";

const HEADER_TABS: Array<{
  id: Exclude<AiAgentTab, "dashboard" | "voice">;
  label: string;
  shortLabel: string;
  icon: typeof Settings2Icon;
  href: string;
}> = [
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Agent",
    icon: Settings2Icon,
    href: DASHBOARD_ROUTES.aiAssistantSettings,
  },
  {
    id: "channels",
    label: "Channels",
    shortLabel: "Channels",
    icon: SlidersHorizontalIcon,
    href: DASHBOARD_ROUTES.aiAssistantChannels,
  },
  {
    id: "knowledge",
    label: "Knowledge",
    shortLabel: "Knowledge",
    icon: BookOpenIcon,
    href: DASHBOARD_ROUTES.aiAssistantKnowledge,
  },
];

type AiAssistantTabBarProps = {
  activeTab: AiAgentTab;
  onTabChange?: (tab: AiAgentTab) => void;
  className?: string;
};

export function AiAssistantTabBar({
  activeTab,
  onTabChange,
  className,
}: AiAssistantTabBarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 overflow-x-auto",
        className,
      )}
    >
      <Link
        href={DASHBOARD_ROUTES.aiAssistant}
        title="Dashboard"
        className={cn(
          "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-xs transition-colors sm:min-w-[4.5rem] sm:px-2.5 sm:text-sm",
          getNavSegmentActiveClassName(
            activeTab === "dashboard" && pathname === DASHBOARD_ROUTES.aiAssistant,
          ),
        )}
        onClick={() => onTabChange?.("dashboard")}
      >
        <span className="hidden sm:inline">Home</span>
        <span className="sm:hidden">⌂</span>
      </Link>
      {HEADER_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            title={tab.label}
            className={cn(
              "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-xs transition-colors sm:min-w-[5.5rem] sm:px-2.5 sm:text-sm",
              getNavSegmentActiveClassName(isActive),
            )}
            onClick={() => onTabChange?.(tab.id)}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.shortLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function navigateToAiAssistantTab(tab: AiAgentTab): string {
  return getAiAssistantTabPath(tab);
}
