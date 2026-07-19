"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { ResendVerificationEmailField } from "@/components/auth/ResendVerificationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/constants/routes";
import { MAGIC_LINK_MESSAGES } from "@/features/auth/constants";
import { useEmailLogin } from "@/hooks/use-email-login";
import { useMagicLinkLogin } from "@/hooks/use-magic-link-login";
import { cn } from "@/lib/utils";

type EmailLoginFormProps = {
  nextPath?: string;
  className?: string;
  onCreateAccountClick?: () => void;
};

type LoginMode = "password" | "magiclink";

type FormErrors = {
  email?: string;
  password?: string;
};

export function EmailLoginForm({
  nextPath,
  className,
  onCreateAccountClick,
}: EmailLoginFormProps) {
  const [mode, setMode] = useState<LoginMode>("password");
  const [errors, setErrors] = useState<FormErrors>({});
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { signIn, isLoading: isPasswordLoading } = useEmailLogin({
    nextPath,
    onEmailNotVerified: (email) => {
      setUnverifiedEmail(email);
      setShowResendVerification(true);
    },
  });
  const { sendMagicLink, isLoading: isMagicLinkLoading } =
    useMagicLinkLogin(nextPath);
  const isLoading = isPasswordLoading || isMagicLinkLoading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setShowResendVerification(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    if (mode === "magiclink") {
      const result = await sendMagicLink({ email });

      if (!result.success && result.error.code === "VALIDATION_ERROR") {
        setErrors((current) => ({ ...current, email: result.error.message }));
      }

      return;
    }

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
            className="h-10 bg-white/72"
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email}</p>
          ) : null}
        </div>

        {mode === "password" ? (
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
            <PasswordInput
              id="login-password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isLoading}
              aria-invalid={Boolean(errors.password)}
              className="h-10 bg-white/72"
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {MAGIC_LINK_MESSAGES.requestDescription}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {mode === "magiclink"
                ? MAGIC_LINK_MESSAGES.sending
                : "Signing in..."}
            </>
          ) : mode === "magiclink" ? (
            MAGIC_LINK_MESSAGES.sendButton
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "password" ? (
          <button
            type="button"
            onClick={() => {
              setMode("magiclink");
              setErrors({});
              setShowResendVerification(false);
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {MAGIC_LINK_MESSAGES.useMagicLink}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrors({});
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {MAGIC_LINK_MESSAGES.usePassword}
          </button>
        )}
      </p>

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
