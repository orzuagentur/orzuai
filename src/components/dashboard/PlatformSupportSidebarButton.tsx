"use client";

import { HeadphonesIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePlatformSupport } from "@/contexts/platform-support-context";

export function PlatformSupportSidebarButton() {
  const { isOpen, toggle, unreadCount } = usePlatformSupport();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="Поддержка OrzuX"
          isActive={isOpen}
          className="h-10 text-[15px]"
          onClick={toggle}
        >
          <HeadphonesIcon className="size-5 shrink-0" />
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
