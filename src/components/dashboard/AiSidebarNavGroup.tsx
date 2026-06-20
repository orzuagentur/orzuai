"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, ChevronDownIcon } from "lucide-react";

import { AiSectionInfoButton } from "@/components/ai-assistant/AiSectionInfoButton";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DASHBOARD_AI_NAV_ITEMS } from "@/features/dashboard/constants";
import { cn } from "@/lib/utils";

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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isOpen, setIsOpen] = useState(isAiNavPath(pathname));

  useEffect(() => {
    if (isAiNavPath(pathname)) {
      setIsOpen(true);
    }
  }, [pathname]);

  const isParentActive = isAiNavPath(pathname);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        isActive={isParentActive}
        tooltip="AI"
        className="h-10 text-[15px] [&_svg]:size-5"
        onClick={() => {
          if (!isCollapsed) {
            setIsOpen((prev) => !prev);
          }
        }}
        asChild={isCollapsed}
      >
        {isCollapsed ? (
          <Link href={DASHBOARD_ROUTES.aiAssistantSection}>
            <Bot />
            <span>AI</span>
          </Link>
        ) : (
          <>
            <Bot />
            <span className="flex-1 text-left">AI</span>
            <ChevronDownIcon
              className={cn(
                "!size-4 shrink-0 text-sidebar-foreground/70 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </>
        )}
      </SidebarMenuButton>

      {isOpen && !isCollapsed ? (
        <SidebarMenuSub className="mx-3.5 gap-0.5 border-l border-sidebar-border px-2.5 py-1">
          {DASHBOARD_AI_NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuSubItem key={item.id} className="relative">
                <SidebarMenuSubButton
                  asChild
                  isActive={isActive}
                  className="h-10 px-3 text-[15px]"
                >
                  <Link href={item.href} className="pr-9">
                    {item.label}
                  </Link>
                </SidebarMenuSubButton>
                <div className="absolute top-1/2 right-1 -translate-y-1/2">
                  <AiSectionInfoButton
                    title={item.infoTitle}
                    body={item.infoBody}
                  />
                </div>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
