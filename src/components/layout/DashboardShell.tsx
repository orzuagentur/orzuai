"use client";

import type { DashboardUserProfile } from "@/types/dashboard.types";

import { InboxChromeProvider } from "@/components/chats/inbox/inbox-chrome-context";
import { ContactsChromeProvider } from "@/components/contacts/contacts-chrome-context";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PushNotificationsProvider } from "@/components/pwa/push-notifications-context";
import { useSupabaseRealtimeBootstrap } from "@/hooks/use-supabase-realtime-bootstrap";

type DashboardShellProps = {
  userProfile: DashboardUserProfile;
  children: React.ReactNode;
};

export function DashboardShell({ userProfile, children }: DashboardShellProps) {
  useSupabaseRealtimeBootstrap();

  return (
    <PushNotificationsProvider>
      <InboxChromeProvider>
        <ContactsChromeProvider>
          <SidebarProvider>
            <AppSidebar userProfile={userProfile} />
            <SidebarInset>
              <DashboardHeader />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </ContactsChromeProvider>
      </InboxChromeProvider>
    </PushNotificationsProvider>
  );
}
