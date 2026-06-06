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
      <SidebarInset className="min-h-0 overflow-hidden">
        <DashboardHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
