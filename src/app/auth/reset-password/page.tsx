import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AUTH_ROUTES } from "@/constants/routes";
import { PASSWORD_RESET_MESSAGES } from "@/features/auth/constants";
import { getCurrentUser } from "@/services/auth.service";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(AUTH_ROUTES.forgotPassword);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{PASSWORD_RESET_MESSAGES.resetTitle}</CardTitle>
          <CardDescription>
            {PASSWORD_RESET_MESSAGES.resetDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResetPasswordForm />
          <Button asChild variant="ghost" className="w-full">
            <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
