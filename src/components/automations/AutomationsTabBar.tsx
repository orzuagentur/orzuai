"use client";

import Link from "next/link";
import { Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import { cn } from "@/lib/utils";
import {
  AUTOMATIONS_TABS,
  buildAutomationsHref,
  type AutomationsTab,
} from "@/utils/automations-url";

type AutomationsTabBarProps = {
  activeTab: AutomationsTab;
  onTabChange: (tab: AutomationsTab) => void;
  variant?: "default" | "header";
  className?: string;
};

const TAB_LABELS: Record<AutomationsTab, string> = {
  overview: AUTOMATIONS_MESSAGES.tabOverview,
  rules: AUTOMATIONS_MESSAGES.tabRules,
  activity: AUTOMATIONS_MESSAGES.tabActivity,
};

export function AutomationsTabBar({
  activeTab,
  onTabChange,
  variant = "default",
  className,
}: AutomationsTabBarProps) {
  if (variant === "header") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 overflow-x-auto",
          className,
        )}
      >
        {AUTOMATIONS_TABS.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
                getNavSegmentActiveClassName(isActive),
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {AUTOMATIONS_TABS.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-2.5 text-xs sm:text-sm",
                getNavSegmentActiveClassName(isActive),
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AutomationsHeaderActionsProps = {
  activeTab: AutomationsTab;
  onEnableRecommended?: () => void;
  isEnablingRecommended?: boolean;
  className?: string;
};

export function AutomationsHeaderActions({
  activeTab,
  onEnableRecommended,
  isEnablingRecommended = false,
  className,
}: AutomationsHeaderActionsProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {activeTab === "rules" ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 gap-1 px-2"
          asChild
        >
          <Link href={buildAutomationsHref({ tab: "rules", workflow: "new" })}>
            <PlusIcon className="size-3.5" />
            <span className="hidden sm:inline">{AUTOMATIONS_MESSAGES.newWorkflow}</span>
          </Link>
        </Button>
      ) : null}

      {onEnableRecommended ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 px-2"
          disabled={isEnablingRecommended}
          onClick={onEnableRecommended}
        >
          {isEnablingRecommended ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <SparklesIcon className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {AUTOMATIONS_MESSAGES.enableRecommended}
          </span>
        </Button>
      ) : null}
    </div>
  );
}
