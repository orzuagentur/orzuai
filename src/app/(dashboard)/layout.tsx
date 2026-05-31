import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AUTH_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
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

  return <DashboardShell userProfile={userProfile}>{children}</DashboardShell>;
}
