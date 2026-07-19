"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/constants/routes";
import { verifyEmailOtpAction } from "@/features/auth/actions/verify-email-otp";
import { REGISTRATION_MESSAGES } from "@/features/auth/constants";

type RegistrationConfirmationProps = {
  email: string;
};

export function RegistrationConfirmation({
  email,
}: RegistrationConfirmationProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsLoading(true);

    try {
      const result = await verifyEmailOtpAction({ email, code });
      if (!result.success) {
        setError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      toast.success("Email verified");
      router.push(AUTH_ROUTES.verifySuccess);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex min-h-[520px] w-full max-w-md flex-col">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheckIcon className="size-6" />
        </div>
        <CardTitle>{REGISTRATION_MESSAGES.confirmationTitle}</CardTitle>
        <CardDescription>
          {REGISTRATION_MESSAGES.confirmationDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-4">
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Code sent to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>

          <form
            onSubmit={(event) => {
              void handleVerify(event);
            }}
            className="space-y-3"
            noValidate
          >
            <div className="space-y-2 text-left">
              <Label htmlFor="signup-otp">{REGISTRATION_MESSAGES.otpCodeLabel}</Label>
              <Input
                id="signup-otp"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={REGISTRATION_MESSAGES.otpCodePlaceholder}
                disabled={isLoading}
                aria-invalid={Boolean(error)}
                className="h-11 tracking-[0.2em]"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {REGISTRATION_MESSAGES.otpVerifying}
                </>
              ) : (
                REGISTRATION_MESSAGES.otpVerifyButton
              )}
            </Button>
          </form>

          <ResendVerificationForm email={email} />
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full" variant="outline">
            <Link href={AUTH_ROUTES.login}>Sign in</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href={AUTH_ROUTES.register}>Use a different email</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
