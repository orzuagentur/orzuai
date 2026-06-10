"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";
import { useDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import { countChannelsWithUnread } from "@/utils/conversation-unread";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import type { DashboardUserProfile } from "@/types/dashboard.types";

import { UserProfileSection } from "./UserProfileSection";

type AppSidebarProps = {
  userProfile: DashboardUserProfile;
};

function getNavBadgeCount(
  itemId: string,
  counts: ReturnType<typeof useDashboardNavBadges>["counts"],
): number {
  if (itemId === "chats") {
    return countChannelsWithUnread(counts.unreadByChannel);
  }

  if (itemId === "contacts") {
    return counts.crmUnread;
  }

  return 0;
}

export function AppSidebar({ userProfile }: AppSidebarProps) {
  const pathname = usePathname();
  const { counts } = useDashboardNavBadges();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12">
              <Link href={DASHBOARD_NAV_ITEMS[0].href}>
                <BrandMark size={36} />
                <BrandWordmark className="flex-1" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DASHBOARD_NAV_ITEMS.map((item) => {
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
                      className="h-10 text-[15px] [&_svg]:size-5"
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

      <SidebarFooter>
        <UserProfileSection userProfile={userProfile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
