import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_ROUTES } from "@/constants/routes";
import { PASSWORD_RESET_MESSAGES } from "@/features/auth/constants";
import { getCurrentUser } from "@/services/auth.service";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{PASSWORD_RESET_MESSAGES.requestTitle}</CardTitle>
          <CardDescription>
            {PASSWORD_RESET_MESSAGES.requestDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ForgotPasswordForm />
          <Button asChild variant="ghost" className="w-full">
            <Link href={APP_ROUTES.home}>Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
