"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { SIDEBAR_NAV_BUTTON_CLASS } from "@/features/navigation/sidebar-nav-ui";

type AiSidebarNavGroupProps = {
  pathname: string;
};

function isAiNavPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.aiAssistant ||
    pathname.startsWith(`${DASHBOARD_ROUTES.aiAssistant}/`)
  );
}

export function AiSidebarNavGroup({ pathname }: AiSidebarNavGroupProps) {
  const isParentActive = isAiNavPath(pathname);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isParentActive}
        tooltip="AI Agent"
        className={SIDEBAR_NAV_BUTTON_CLASS}
      >
        <Link href={DASHBOARD_ROUTES.aiAssistant}>
          <Bot />
          <span>AI Agent</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
