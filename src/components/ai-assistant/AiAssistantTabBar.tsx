"use client";

import {
  BookOpenIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  Volume2Icon,
} from "lucide-react";

import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";
import type { AiAgentTab } from "@/types/agent-dashboard.types";

const HEADER_TABS: Array<{
  id: Exclude<AiAgentTab, "dashboard">;
  label: string;
  shortLabel: string;
  icon: typeof Settings2Icon;
}> = [
  { id: "settings", label: "Settings", shortLabel: "Agent", icon: Settings2Icon },
  { id: "channels", label: "Channels", shortLabel: "Channels", icon: SlidersHorizontalIcon },
  { id: "knowledge", label: "Knowledge", shortLabel: "Knowledge", icon: BookOpenIcon },
  { id: "voice", label: "Voice", shortLabel: "Voice", icon: Volume2Icon },
];

type AiAssistantTabBarProps = {
  activeTab: AiAgentTab;
  onTabChange: (tab: AiAgentTab) => void;
  className?: string;
};

export function AiAssistantTabBar({
  activeTab,
  onTabChange,
  className,
}: AiAssistantTabBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 overflow-x-auto",
        className,
      )}
    >
      {HEADER_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            className={cn(
              "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-xs transition-colors sm:min-w-[5.5rem] sm:px-2.5 sm:text-sm",
              getNavSegmentActiveClassName(isActive),
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
