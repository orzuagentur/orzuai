"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { ResendVerificationEmailField } from "@/components/auth/ResendVerificationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/constants/routes";
import { useEmailLogin } from "@/hooks/use-email-login";
import { cn } from "@/lib/utils";

type EmailLoginFormProps = {
  nextPath?: string;
  className?: string;
  onCreateAccountClick?: () => void;
};

type FormErrors = {
  email?: string;
  password?: string;
};

export function EmailLoginForm({
  nextPath,
  className,
  onCreateAccountClick,
}: EmailLoginFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { signIn, isLoading } = useEmailLogin({
    nextPath,
    onEmailNotVerified: (email) => {
      setUnverifiedEmail(email);
      setShowResendVerification(true);
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setShowResendVerification(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn({ email, password });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("email")) {
        setErrors((current) => ({ ...current, email: result.error.message }));
      } else {
        setErrors((current) => ({
          ...current,
          password: result.error.message,
        }));
      }
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isLoading}
            defaultValue={unverifiedEmail}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Link
              href={AUTH_ROUTES.forgotPassword}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isLoading}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {showResendVerification ? (
        <ResendVerificationEmailField defaultEmail={unverifiedEmail} />
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        {onCreateAccountClick ? (
          <button
            type="button"
            onClick={onCreateAccountClick}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create account
          </button>
        ) : (
          <Link
            href={AUTH_ROUTES.register}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        )}
      </p>
    </div>
  );
}
