"use client";

import type { DashboardUserProfile } from "@/types/dashboard.types";

import { AnalyticsChromeProvider } from "@/components/analytics/analytics-chrome-context";
import { AutomationsChromeProvider } from "@/components/automations/automations-chrome-context";
import { InboxChromeProvider } from "@/components/chats/inbox/inbox-chrome-context";
import { AiAssistantChromeProvider } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { ContactsChromeProvider } from "@/components/contacts/contacts-chrome-context";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardInboundAlerts } from "@/components/dashboard/DashboardInboundAlerts";
import { AiHumanRequestOverlay } from "@/components/dashboard/AiHumanRequestOverlay";
import { DashboardAiHumanAlerts } from "@/components/dashboard/DashboardAiHumanAlerts";
import { DashboardNavBadgesProvider } from "@/contexts/dashboard-nav-badges-context";
import { AiHumanRequestsProvider } from "@/contexts/ai-human-requests-context";
import { DashboardProfileProvider } from "@/contexts/dashboard-profile-context";
import { PlatformCopilotProvider } from "@/contexts/platform-copilot-context";
import { PlatformCopilotWidget } from "@/components/platform-copilot/PlatformCopilotWidget";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PushNotificationsProvider } from "@/components/pwa/push-notifications-context";
import { useSupabaseRealtimeBootstrap } from "@/hooks/use-supabase-realtime-bootstrap";

type DashboardShellProps = {
  userProfile: DashboardUserProfile;
  googleCalendarConnected?: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  userProfile,
  googleCalendarConnected = false,
  children,
}: DashboardShellProps) {
  useSupabaseRealtimeBootstrap();

  return (
    <PushNotificationsProvider>
      <DashboardNavBadgesProvider>
        <AiHumanRequestsProvider>
          <DashboardInboundAlerts />
          <DashboardAiHumanAlerts />
        <InboxChromeProvider>
          <ContactsChromeProvider>
            <AiAssistantChromeProvider>
            <AnalyticsChromeProvider>
            <AutomationsChromeProvider>
            <DashboardProfileProvider userProfile={userProfile}>
            <PlatformCopilotProvider>
            <SidebarProvider>
              <AppSidebar
                userProfile={userProfile}
                googleCalendarConnected={googleCalendarConnected}
              />
              <SidebarInset>
                <DashboardHeader />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
            <PlatformCopilotWidget />
            <AiHumanRequestOverlay />
            </PlatformCopilotProvider>
            </DashboardProfileProvider>
            </AutomationsChromeProvider>
            </AnalyticsChromeProvider>
            </AiAssistantChromeProvider>
          </ContactsChromeProvider>
        </InboxChromeProvider>
        </AiHumanRequestsProvider>
      </DashboardNavBadgesProvider>
    </PushNotificationsProvider>
  );
}
