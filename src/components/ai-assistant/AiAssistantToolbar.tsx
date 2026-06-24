"use client";

import { PlusIcon, SearchIcon } from "lucide-react";

import { AiAssistantTabBar } from "@/components/ai-assistant/AiAssistantTabBar";
import type { AiAssistantChromeConfig } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";

type AiAssistantToolbarProps = AiAssistantChromeConfig & {
  className?: string;
};

export function AiAssistantToolbar({
  activeTab,
  onTabChange,
  showTabs,
  searchQuery = "",
  onSearchChange,
  onNewAgent,
  showSearch = false,
  showNewAgent = false,
  className,
}: AiAssistantToolbarProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      {showSearch && onSearchChange ? (
        <div className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={AI_ASSISTANT_MESSAGES.searchPlaceholder}
            className="h-8 pl-8 text-sm"
            aria-label={AI_ASSISTANT_MESSAGES.searchPlaceholder}
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {showTabs ? (
        <AiAssistantTabBar activeTab={activeTab} onTabChange={onTabChange} />
      ) : null}

      {showNewAgent && onNewAgent ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={onNewAgent}
        >
          <PlusIcon className="size-3.5" />
          <span className="hidden sm:inline">{AI_ASSISTANT_MESSAGES.newAgent}</span>
        </Button>
      ) : null}
    </div>
  );
}
