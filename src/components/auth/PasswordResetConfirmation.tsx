import Link from "next/link";

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
import { MailCheckIcon } from "lucide-react";

type PasswordResetConfirmationProps = {
  email?: string;
};

export function PasswordResetConfirmation({
  email,
}: PasswordResetConfirmationProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheckIcon className="size-6" />
        </div>
        <CardTitle>{PASSWORD_RESET_MESSAGES.confirmationTitle}</CardTitle>
        <CardDescription>
          {PASSWORD_RESET_MESSAGES.confirmationDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {email ? (
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, a
            reset link is on its way.
          </p>
        ) : null}
        <Button asChild className="w-full">
          <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
