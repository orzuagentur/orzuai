"use client";

import type { DashboardUserProfile } from "@/types/dashboard.types";

import { InboxChromeProvider } from "@/components/chats/inbox/inbox-chrome-context";
import { AiAssistantChromeProvider } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { ContactsChromeProvider } from "@/components/contacts/contacts-chrome-context";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardNavBadgesProvider } from "@/contexts/dashboard-nav-badges-context";
import { PlatformCopilotWidget } from "@/components/platform-copilot/PlatformCopilotWidget";
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
      <DashboardNavBadgesProvider>
        <InboxChromeProvider>
          <ContactsChromeProvider>
            <AiAssistantChromeProvider>
            <SidebarProvider>
              <AppSidebar userProfile={userProfile} />
              <SidebarInset>
                <DashboardHeader />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
            <PlatformCopilotWidget />
            </AiAssistantChromeProvider>
          </ContactsChromeProvider>
        </InboxChromeProvider>
      </DashboardNavBadgesProvider>
    </PushNotificationsProvider>
  );
}
