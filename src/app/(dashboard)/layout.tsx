import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { getOnboardingProgress } from "@/services/onboarding.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { isGoogleCalendarConnected } from "@/services/google-calendar.service";
import { getActivePlatformAnnouncements } from "@/services/platform-announcements.service";
import { getUserProfile } from "@/services/user.service";
import { getVoiceClientConfig } from "@/services/voice-client.service";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(AUTH_ROUTES.login);
  }

  const userProfile = await getUserProfile(user);
  const ownedBusiness = await getPrimaryBusiness(user.id);
  const business =
    (await getAccessibleBusiness(user.id)) ?? ownedBusiness;
  const onboardingProgress = ownedBusiness
    ? await getOnboardingProgress(ownedBusiness.id)
    : null;
  const googleCalendarConnected = business
    ? await isGoogleCalendarConnected(business.id)
    : false;
  const voiceClientConfig = business
    ? await getVoiceClientConfig(business.id)
    : { enabled: false, phoneNumber: null };
  const announcements = await getActivePlatformAnnouncements(user.id);

  let supportUnreadCount = 0;
  if (business?.id) {
    const supabase = await createClient();
    const { data: supportThread } = await supabase
      .from("platform_support_threads")
      .select("unread_by_business")
      .eq("business_id", business.id)
      .maybeSingle();
    supportUnreadCount = Number(supportThread?.unread_by_business ?? 0);
  }

  return (
    <DashboardShell
      userProfile={userProfile}
      googleCalendarConnected={googleCalendarConnected}
      voiceBusinessId={business?.id ?? null}
      voiceClientEnabled={voiceClientConfig.enabled}
      announcements={announcements}
      supportUnreadCount={supportUnreadCount}
      onboardingProgress={onboardingProgress}
    >
      {children}
    </DashboardShell>
  );
}
