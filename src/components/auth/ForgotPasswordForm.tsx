"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/constants/routes";
import { usePasswordResetRequest } from "@/hooks/use-password-reset-request";
import { cn } from "@/lib/utils";

type ForgotPasswordFormProps = {
  className?: string;
};

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const [emailError, setEmailError] = useState<string>();
  const { requestReset, isLoading } = usePasswordResetRequest();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(undefined);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    const result = await requestReset({ email });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      setEmailError(result.error.message);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={cn("space-y-4", className)}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="forgot-password-email">Email</Label>
        <Input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          disabled={isLoading}
          aria-invalid={Boolean(emailError)}
        />
        {emailError ? (
          <p className="text-sm text-destructive">{emailError}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Sending reset link...
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href={AUTH_ROUTES.login}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
