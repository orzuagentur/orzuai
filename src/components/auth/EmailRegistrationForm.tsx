"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/constants/routes";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/constants";
import { useEmailRegistration } from "@/hooks/use-email-registration";
import { cn } from "@/lib/utils";

type EmailRegistrationFormProps = {
  className?: string;
  onSignInClick?: () => void;
};

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function EmailRegistrationForm({
  className,
  onSignInClick,
}: EmailRegistrationFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const { register, isLoading } = useEmailRegistration({
    onSuccess: (email) => {
      const confirmationUrl = new URL(
        AUTH_ROUTES.registerConfirmation,
        window.location.origin,
      );
      confirmationUrl.searchParams.set("email", email);
      router.push(`${confirmationUrl.pathname}${confirmationUrl.search}`);
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const result = await register({
      email,
      password,
      confirmPassword,
    });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("email")) {
        setErrors((current) => ({ ...current, email: result.error.message }));
      } else if (message.includes("confirm")) {
        setErrors((current) => ({
          ...current,
          confirmPassword: result.error.message,
        }));
      } else {
        setErrors((current) => ({
          ...current,
          password: result.error.message,
        }));
      }
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          disabled={isLoading}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          disabled={isLoading}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          disabled={isLoading}
          aria-invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        {onSignInClick ? (
          <button
            type="button"
            onClick={onSignInClick}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </button>
        ) : (
          <Link
            href={AUTH_ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        )}
      </p>
    </form>
  );
}
