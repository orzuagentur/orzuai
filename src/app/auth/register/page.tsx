import { redirect } from "next/navigation";

import { AuthPlatformShell } from "@/components/auth/AuthPlatformShell";
import { RegisterAuthSection } from "@/components/auth/RegisterAuthSection";
import { getCurrentUser } from "@/services/auth.service";
import { resolveAuthenticatedLandingPathForUser } from "@/utils/post-auth-redirect";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(await resolveAuthenticatedLandingPathForUser(user.id));
  }

  return (
    <AuthPlatformShell
      hideBrandMark
      title="Create your OrzuX account"
      description="Launch a multi-channel AI assistant with inbox, CRM, calls, calendar, and analytics ready to grow."
    >
      <RegisterAuthSection />
    </AuthPlatformShell>
  );
}
