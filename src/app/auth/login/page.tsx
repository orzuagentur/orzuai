import { redirect } from "next/navigation";

import { LoginAuthSection } from "@/components/auth/LoginAuthSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getSafeRedirectPath } from "@/utils/auth";
import { resolveAuthenticatedLandingPath } from "@/utils/post-auth-redirect";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const business = await getPrimaryBusiness(user.id);
    redirect(resolveAuthenticatedLandingPath(Boolean(business), params.next));
  }

  const nextPath = getSafeRedirectPath(params.next);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome back to OrzuX</CardTitle>
          <CardDescription>
            Sign in to manage your multi-channel AI inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginAuthSection nextPath={nextPath} />
        </CardContent>
      </Card>
    </div>
  );
}
