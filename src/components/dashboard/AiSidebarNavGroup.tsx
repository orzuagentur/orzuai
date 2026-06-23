"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";

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
        className="h-10 text-[15px] [&_svg]:size-5"
      >
        <Link href={DASHBOARD_ROUTES.aiAssistant}>
          <Bot />
          <span>AI Agent</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
