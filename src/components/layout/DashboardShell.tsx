"use client";

import dynamic from "next/dynamic";
import type { DashboardUserProfile } from "@/types/dashboard.types";

import { AnalyticsChromeProvider } from "@/components/analytics/analytics-chrome-context";
import { AutomationsChromeProvider } from "@/components/automations/automations-chrome-context";
import { InboxChromeProvider } from "@/components/chats/inbox/inbox-chrome-context";
import { AiAssistantChromeProvider } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { CalendarChromeProvider } from "@/components/orzux-calendar/calendar-chrome-context";
import { ContactsChromeProvider } from "@/components/contacts/contacts-chrome-context";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardNavBadgesProvider } from "@/contexts/dashboard-nav-badges-context";
import { AiHumanRequestsProvider } from "@/contexts/ai-human-requests-context";
import { DashboardProfileProvider } from "@/contexts/dashboard-profile-context";
import { PlatformCopilotProvider } from "@/contexts/platform-copilot-context";
import { PlatformSupportProvider } from "@/contexts/platform-support-context";
import { PlatformAnnouncementsBanner } from "@/components/dashboard/PlatformAnnouncementsBanner";
import type { PlatformAnnouncement } from "@/services/platform-announcements.service";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PushNotificationsProvider } from "@/components/pwa/push-notifications-context";
import { VoiceSoftphoneProvider } from "@/components/voice/voice-softphone-context";
import { VoiceSoftphoneBarGate } from "@/components/voice/VoiceSoftphoneBar";
import { useSupabaseRealtimeBootstrap } from "@/hooks/use-supabase-realtime-bootstrap";

const DashboardInboundAlerts = dynamic(
  () =>
    import("@/components/dashboard/DashboardInboundAlerts").then(
      (mod) => mod.DashboardInboundAlerts,
    ),
  { ssr: false },
);

const DashboardAiHumanAlerts = dynamic(
  () =>
    import("@/components/dashboard/DashboardAiHumanAlerts").then(
      (mod) => mod.DashboardAiHumanAlerts,
    ),
  { ssr: false },
);

const AiHumanRequestOverlay = dynamic(
  () =>
    import("@/components/dashboard/AiHumanRequestOverlay").then(
      (mod) => mod.AiHumanRequestOverlay,
    ),
  { ssr: false },
);

const PlatformCopilotWidget = dynamic(
  () =>
    import("@/components/platform-copilot/PlatformCopilotWidget").then(
      (mod) => mod.PlatformCopilotWidget,
    ),
  { ssr: false },
);

const PlatformSupportWidget = dynamic(
  () =>
    import("@/components/platform-support/PlatformSupportWidget").then(
      (mod) => mod.PlatformSupportWidget,
    ),
  { ssr: false },
);

type DashboardShellProps = {
  userProfile: DashboardUserProfile;
  googleCalendarConnected?: boolean;
  voiceBusinessId?: string | null;
  voiceClientEnabled?: boolean;
  announcements?: PlatformAnnouncement[];
  supportUnreadCount?: number;
  children: React.ReactNode;
};

export function DashboardShell({
  userProfile,
  googleCalendarConnected = false,
  voiceBusinessId = null,
  voiceClientEnabled = false,
  announcements = [],
  supportUnreadCount = 0,
  children,
}: DashboardShellProps) {
  useSupabaseRealtimeBootstrap();

  return (
    <PushNotificationsProvider>
      <DashboardNavBadgesProvider>
        <AiHumanRequestsProvider>
          <VoiceSoftphoneProvider
            enabled={voiceClientEnabled}
            businessId={voiceBusinessId}
          >
            <DashboardInboundAlerts />
            <DashboardAiHumanAlerts />
            <InboxChromeProvider>
              <ContactsChromeProvider>
                <AiAssistantChromeProvider>
                  <CalendarChromeProvider>
                    <AnalyticsChromeProvider>
                      <AutomationsChromeProvider>
                        <DashboardProfileProvider userProfile={userProfile}>
                          <PlatformCopilotProvider>
                            <PlatformSupportProvider
                              initialUnreadCount={supportUnreadCount}
                            >
                              <SidebarProvider>
                                <AppSidebar
                                  userProfile={userProfile}
                                  googleCalendarConnected={googleCalendarConnected}
                                />
                                <SidebarInset>
                                  <DashboardHeader />
                                  <PlatformAnnouncementsBanner
                                    announcements={announcements}
                                  />
                                  <VoiceSoftphoneBarGate />
                                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                                    {children}
                                  </div>
                                </SidebarInset>
                              </SidebarProvider>
                              <PlatformCopilotWidget />
                              <PlatformSupportWidget />
                              <AiHumanRequestOverlay />
                            </PlatformSupportProvider>
                          </PlatformCopilotProvider>
                        </DashboardProfileProvider>
                      </AutomationsChromeProvider>
                    </AnalyticsChromeProvider>
                  </CalendarChromeProvider>
                </AiAssistantChromeProvider>
              </ContactsChromeProvider>
            </InboxChromeProvider>
          </VoiceSoftphoneProvider>
        </AiHumanRequestsProvider>
      </DashboardNavBadgesProvider>
    </PushNotificationsProvider>
  );
}
