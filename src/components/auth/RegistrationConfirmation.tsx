import Link from "next/link";

import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import { REGISTRATION_MESSAGES } from "@/features/auth/constants";
import { MailCheckIcon } from "lucide-react";

type RegistrationConfirmationProps = {
  email?: string;
};

export function RegistrationConfirmation({
  email,
}: RegistrationConfirmationProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheckIcon className="size-6" />
        </div>
        <CardTitle>{REGISTRATION_MESSAGES.confirmationTitle}</CardTitle>
        <CardDescription>
          {REGISTRATION_MESSAGES.confirmationDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {email ? (
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        ) : null}
        {email ? <ResendVerificationForm email={email} /> : null}
        <Button asChild className="w-full">
          <Link href={APP_ROUTES.home}>Back to home</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={AUTH_ROUTES.register}>Use a different email</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
