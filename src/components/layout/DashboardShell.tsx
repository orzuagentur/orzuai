"use client";

import type { DashboardUserProfile } from "@/types/dashboard.types";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type DashboardShellProps = {
  userProfile: DashboardUserProfile;
  children: React.ReactNode;
};

export function DashboardShell({ userProfile, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar userProfile={userProfile} />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
