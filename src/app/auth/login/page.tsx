import { redirect } from "next/navigation";

import { AuthPlatformShell } from "@/components/auth/AuthPlatformShell";
import { LoginAuthSection } from "@/components/auth/LoginAuthSection";
import { getCurrentUser } from "@/services/auth.service";
import { getSafeRedirectPath } from "@/utils/auth";
import { resolveAuthenticatedLandingPathForUser } from "@/utils/post-auth-redirect";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect(
      await resolveAuthenticatedLandingPathForUser(user.id, params.next),
    );
  }

  const nextPath = getSafeRedirectPath(params.next);

  return (
    <AuthPlatformShell
      eyebrow="Secure sign in"
      title="Welcome back to OrzuX"
      description="Sign in to manage your AI inbox, CRM, voice calls, bookings, and team workflows."
    >
      <LoginAuthSection nextPath={nextPath} />
    </AuthPlatformShell>
  );
}
