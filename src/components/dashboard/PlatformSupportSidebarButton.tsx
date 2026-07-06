"use client";

import { HeadphonesIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePlatformSupport } from "@/contexts/platform-support-context";
import { SIDEBAR_NAV_BUTTON_CLASS } from "@/features/navigation/sidebar-nav-ui";

export function PlatformSupportSidebarButton() {
  const { isOpen, toggle, unreadCount } = usePlatformSupport();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="Поддержка OrzuX"
          isActive={isOpen}
          className={SIDEBAR_NAV_BUTTON_CLASS}
          onClick={toggle}
        >
          <HeadphonesIcon className="shrink-0" />
          <span>Поддержка OrzuX</span>
          {unreadCount > 0 ? (
            <SidebarMenuBadge>
              {unreadCount > 99 ? "99+" : unreadCount}
            </SidebarMenuBadge>
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
