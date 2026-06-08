"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand/BrandMark";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";
import { BRAND_NAME, BRAND_TAGLINE } from "@/constants/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { DashboardUserProfile } from "@/types/dashboard.types";

import { UserProfileSection } from "./UserProfileSection";

type AppSidebarProps = {
  userProfile: DashboardUserProfile;
};

export function AppSidebar({ userProfile }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12">
              <Link href={DASHBOARD_NAV_ITEMS[0].href}>
                <BrandMark size={36} className="rounded-lg" />
                <div className="grid flex-1 text-left text-[15px] leading-tight">
                  <span className="truncate font-semibold">{BRAND_NAME}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {BRAND_TAGLINE}
                  </span>
                </div>
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
