import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getSafeRedirectPath } from "@/utils/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome back to OrzuAI</CardTitle>
          <CardDescription>
            Sign in to manage your AI WhatsApp assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailLoginForm nextPath={nextPath} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <Separator className="flex-1" />
          </div>
          <GoogleSignInButton nextPath={nextPath} />
          <Button asChild variant="ghost" className="w-full">
            <Link href={APP_ROUTES.home}>Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
