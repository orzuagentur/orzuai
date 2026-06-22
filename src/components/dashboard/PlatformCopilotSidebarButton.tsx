"use client";

import { AiAssistantIcon } from "@/components/icons/AiAssistantIcon";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";

export function PlatformCopilotSidebarButton() {
  const { isOpen, toggle } = usePlatformCopilot();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip={PLATFORM_COPILOT_MESSAGES.sidebarLabel}
          isActive={isOpen}
          className="h-10 text-[15px]"
          onClick={toggle}
        >
          <AiAssistantIcon size={24} className="size-6 shrink-0" />
          <span>{PLATFORM_COPILOT_MESSAGES.sidebarLabel}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
