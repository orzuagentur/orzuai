"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { AiSidebarNavGroup } from "@/components/dashboard/AiSidebarNavGroup";
import {
  SidebarPinLock,
  type SidebarPinMode,
} from "@/components/dashboard/SidebarPinLock";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BRAND_NAME } from "@/constants/brand";
import {
  buildDashboardNavItems,
  DASHBOARD_NAV_ITEMS,
} from "@/features/dashboard/constants";
import { SIDEBAR_NAV_BUTTON_CLASS } from "@/features/navigation/sidebar-nav-ui";
import { useDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { DashboardUserProfile } from "@/types/dashboard.types";

import { UserProfileSection } from "./UserProfileSection";
import { AiHumanRequestsButton } from "./AiHumanRequestsButton";
import { PlatformCopilotSidebarButton } from "./PlatformCopilotSidebarButton";

const PIN_STORAGE_KEY = "orzu-sidebar-pin-mode";

type AppSidebarProps = {
  userProfile: DashboardUserProfile;
  googleCalendarConnected?: boolean;
};

function getNavBadgeCount(
  itemId: string,
  counts: ReturnType<typeof useDashboardNavBadges>["counts"],
): number {
  if (itemId === "chats") {
    return counts.inboxUnread;
  }

  if (itemId === "calendar") {
    return (
      counts.calendarAiUnread + counts.overdueTasks + counts.upcomingEvents
    );
  }

  if (itemId === "contacts") {
    return counts.crmUnread + counts.overdueTasks;
  }

  return 0;
}

function readStoredPinMode(): SidebarPinMode {
  if (typeof window === "undefined") {
    return "hover";
  }
  const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
  if (
    stored === "hover" ||
    stored === "locked-open" ||
    stored === "locked-closed"
  ) {
    return stored;
  }
  return "hover";
}

function isTooltipTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        '[data-slot="tooltip-content"], [data-radix-popper-content-wrapper], [role="tooltip"]',
      ),
    )
  );
}

function AppSidebarInner({
  userProfile,
  googleCalendarConnected = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { counts } = useDashboardNavBadges();
  const { open, setOpen, isMobile } = useSidebar();
  const navItems = buildDashboardNavItems({ googleCalendarConnected });
  const [pinMode, setPinMode] = useState<SidebarPinMode>("hover");
  const [hydrated, setHydrated] = useState(false);
  const pinModeRef = useRef<SidebarPinMode>(pinMode);
  const closeTimerRef = useRef<number | null>(null);
  pinModeRef.current = pinMode;

  useEffect(() => {
    const stored = readStoredPinMode();
    setPinMode(stored);
    setHydrated(true);
    if (isMobile) return;
    setOpen(stored === "locked-open");
  }, [isMobile, setOpen]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const persistPinMode = useCallback((mode: SidebarPinMode) => {
    setPinMode(mode);
    window.localStorage.setItem(PIN_STORAGE_KEY, mode);
  }, []);

  const handleTogglePin = useCallback(() => {
    clearCloseTimer();
    if (open) {
      if (pinMode === "locked-open") {
        // Unlock: allow hover collapse again
        persistPinMode("hover");
      } else {
        // Lock open: stay expanded
        persistPinMode("locked-open");
        setOpen(true);
      }
      return;
    }

    if (pinMode === "locked-closed") {
      // Unlock closed: hover can expand again
      persistPinMode("hover");
      setOpen(true);
    } else {
      persistPinMode("locked-closed");
      setOpen(false);
    }
  }, [clearCloseTimer, open, pinMode, persistPinMode, setOpen]);

  const onMouseEnter = useCallback(() => {
    if (isMobile || !hydrated) return;
    clearCloseTimer();
    // Locked-closed: stay collapsed. Hover / locked-open: expand.
    if (pinModeRef.current === "locked-closed") return;
    setOpen(true);
  }, [clearCloseTimer, hydrated, isMobile, setOpen]);

  const onMouseLeave = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (isMobile || !hydrated) return;
      if (isTooltipTarget(event.relatedTarget)) return;

      clearCloseTimer();
      // Keep open only while locked-open. Open lock (hover) closes on leave.
      if (pinModeRef.current === "locked-open") return;

      closeTimerRef.current = window.setTimeout(() => {
        if (pinModeRef.current === "locked-open") return;
        setOpen(false);
        closeTimerRef.current = null;
      }, 280);
    },
    [clearCloseTimer, hydrated, isMobile, setOpen],
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="border-r border-sidebar-border/70 bg-sidebar/90"
    >
      <SidebarHeader className="gap-0 border-b border-sidebar-border/70 p-2 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col items-center">
              <SidebarMenuButton
                size="lg"
                asChild
                tooltip={BRAND_NAME}
                className="h-12 text-sidebar-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
              >
                <Link
                  href={DASHBOARD_NAV_ITEMS[0].href}
                  className="flex w-full items-center gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                >
                  <BrandMark
                    size={36}
                    className="size-9 shrink-0 transition-[width,height] duration-200 ease-linear group-data-[collapsible=icon]:size-7"
                  />
                  <BrandWordmark className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden" />
                </Link>
              </SidebarMenuButton>

              <SidebarPinLock
                pinMode={pinMode}
                isExpanded={open}
                onToggle={handleTogglePin}
                className="size-8 [&_svg]:size-4"
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase text-sidebar-foreground/55">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.id === "ai-assistant") {
                  return <AiSidebarNavGroup key={item.id} pathname={pathname} />;
                }

                const isActive =
                  item.href === DASHBOARD_NAV_ITEMS[0].href
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                const badgeCount = getNavBadgeCount(item.id, counts);

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={SIDEBAR_NAV_BUTTON_CLASS}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        {badgeCount > 0 ? (
                          <SidebarMenuBadge>
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </SidebarMenuBadge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 bg-sidebar/70">
        <PlatformCopilotSidebarButton />
        <AiHumanRequestsButton />
        <UserProfileSection userProfile={userProfile} />
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  return <AppSidebarInner {...props} />;
}
