"use client";

import { AiAssistantIcon } from "@/components/icons/AiAssistantIcon";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";
import { SIDEBAR_NAV_BUTTON_CLASS } from "@/features/navigation/sidebar-nav-ui";

export function PlatformCopilotSidebarButton() {
  const { isOpen, toggle } = usePlatformCopilot();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip={PLATFORM_COPILOT_MESSAGES.sidebarLabel}
          isActive={isOpen}
          className={SIDEBAR_NAV_BUTTON_CLASS}
          onClick={toggle}
        >
          <AiAssistantIcon size={16} className="shrink-0" />
          <span>{PLATFORM_COPILOT_MESSAGES.sidebarLabel}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
