import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { isGoogleCalendarConnected } from "@/services/google-calendar.service";
import { getUserProfile } from "@/services/user.service";

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

  return (
    <DashboardShell
      userProfile={userProfile}
      googleCalendarConnected={googleCalendarConnected}
    >
      {children}
    </DashboardShell>
  );
}
