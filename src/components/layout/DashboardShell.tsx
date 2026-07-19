"use client";

import dynamic from "next/dynamic";
import type { DashboardUserProfile } from "@/types/dashboard.types";

import { AnalyticsChromeProvider } from "@/components/analytics/analytics-chrome-context";
import { InboxChromeProvider } from "@/components/chats/inbox/inbox-chrome-context";
import { AiAssistantChromeProvider } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { CalendarChromeProvider } from "@/components/orzux-calendar/calendar-chrome-context";
import { ContactsChromeProvider } from "@/components/contacts/contacts-chrome-context";
import { OrdersChromeProvider } from "@/components/orders/orders-chrome-context";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardNavBadgesProvider } from "@/contexts/dashboard-nav-badges-context";
import { AiHumanRequestsProvider } from "@/contexts/ai-human-requests-context";
import { DashboardProfileProvider } from "@/contexts/dashboard-profile-context";
import { PlatformCopilotProvider } from "@/contexts/platform-copilot-context";
import { PlatformSupportProvider } from "@/contexts/platform-support-context";
import { PlatformAnnouncementsBanner } from "@/components/dashboard/PlatformAnnouncementsBanner";
import type { OnboardingProgress } from "@/services/onboarding.service";
import type { PlatformAnnouncement } from "@/services/platform-announcements.service";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PushNotificationsProvider } from "@/components/pwa/push-notifications-context";
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

const SetupProgressCard = dynamic(
  () =>
    import("@/components/onboarding/SetupProgressCard").then(
      (mod) => mod.SetupProgressCard,
    ),
  { ssr: false },
);

type DashboardShellProps = {
  userProfile: DashboardUserProfile;
  googleCalendarConnected?: boolean;
  announcements?: PlatformAnnouncement[];
  supportUnreadCount?: number;
  onboardingProgress?: OnboardingProgress | null;
  children: React.ReactNode;
};

export function DashboardShell({
  userProfile,
  googleCalendarConnected = false,
  announcements = [],
  supportUnreadCount = 0,
  onboardingProgress = null,
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
                <OrdersChromeProvider>
                <AiAssistantChromeProvider>
                  <CalendarChromeProvider>
                    <AnalyticsChromeProvider>
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
                                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                                  {children}
                                </div>
                              </SidebarInset>
                            </SidebarProvider>
                            <PlatformCopilotWidget />
                            <PlatformSupportWidget />
                            {onboardingProgress && !onboardingProgress.isComplete ? (
                              <SetupProgressCard progress={onboardingProgress} />
                            ) : null}
                            <AiHumanRequestOverlay />
                          </PlatformSupportProvider>
                        </PlatformCopilotProvider>
                      </DashboardProfileProvider>
                    </AnalyticsChromeProvider>
                  </CalendarChromeProvider>
                </AiAssistantChromeProvider>
                </OrdersChromeProvider>
              </ContactsChromeProvider>
            </InboxChromeProvider>
        </AiHumanRequestsProvider>
      </DashboardNavBadgesProvider>
    </PushNotificationsProvider>
  );
}
