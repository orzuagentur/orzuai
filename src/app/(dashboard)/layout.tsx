import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { isGoogleCalendarConnected } from "@/services/google-calendar.service";
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
  const business = await getPrimaryBusiness(user.id);
  const googleCalendarConnected = business
    ? await isGoogleCalendarConnected(business.id)
    : false;
  const voiceClientConfig = business
    ? await getVoiceClientConfig(business.id)
    : { enabled: false, phoneNumber: null };

  return (
    <DashboardShell
      userProfile={userProfile}
      googleCalendarConnected={googleCalendarConnected}
      voiceBusinessId={business?.id ?? null}
      voiceClientEnabled={voiceClientConfig.enabled}
    >
      {children}
    </DashboardShell>
  );
}
