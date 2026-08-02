"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES, LEGAL_ROUTES } from "@/constants/routes";
import { ACCOUNT_DELETION_MESSAGES } from "@/features/auth/constants";
import { useEmailRegistration } from "@/hooks/use-email-registration";
import { cn } from "@/lib/utils";

type EmailRegistrationFormProps = {
  className?: string;
  onSignInClick?: () => void;
  acceptedTerms?: boolean;
  hideTermsField?: boolean;
  /** Rendered above the submit button (e.g. shared Terms checkbox). */
  termsSlot?: ReactNode;
  /** Rendered between submit and the “Already have an account?” link. */
  afterSubmitSlot?: ReactNode;
};

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
};

export function EmailRegistrationForm({
  className,
  onSignInClick,
  acceptedTerms: acceptedTermsProp,
  hideTermsField = false,
  termsSlot,
  afterSubmitSlot,
}: EmailRegistrationFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const turnstileMissing = turnstileEnabled && !turnstileToken;
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
    const nextPassword = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const acceptedTerms = hideTermsField
      ? Boolean(acceptedTermsProp)
      : formData.get("acceptedTerms") === "on";

    if (!acceptedTerms) {
      setErrors({
        acceptedTerms: ACCOUNT_DELETION_MESSAGES.termsRequired,
      });
      return;
    }

    if (turnstileMissing) {
      toast.error("Please complete the verification.");
      return;
    }

    const businessName = String(formData.get("businessName") ?? "").trim();

    const result = await register(
      {
        email,
        password: nextPassword,
        confirmPassword,
        acceptedTerms: true,
        businessName: businessName || undefined,
      },
      turnstileToken ?? undefined,
    );

    if (turnstileEnabled) {
      setTurnstileToken(null);
      setTurnstileResetKey((key) => key + 1);
    }

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("email")) {
        setErrors((current) => ({ ...current, email: result.error.message }));
      } else if (message.includes("terms") || message.includes("privacy")) {
        setErrors((current) => ({
          ...current,
          acceptedTerms: result.error.message,
        }));
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
          className="h-10 bg-white"
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">
          Business name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Acme Coffee Shop"
          disabled={isLoading}
          className="h-10 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="5 letters · 3 symbols · 2 digits"
          disabled={isLoading}
          aria-invalid={Boolean(errors.password)}
          className="h-10 bg-white"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrengthMeter password={password} />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your password"
          disabled={isLoading}
          aria-invalid={Boolean(errors.confirmPassword)}
          className="h-10 bg-white"
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        ) : null}
      </div>

      {termsSlot}

      {!hideTermsField ? (
        <div className="space-y-2">
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="acceptedTerms"
              disabled={isLoading}
              className="mt-1 size-4 rounded border border-input accent-primary"
              aria-invalid={Boolean(errors.acceptedTerms)}
            />
            <span className="text-muted-foreground">
              I agree to the{" "}
              <Link
                href={LEGAL_ROUTES.terms}
                className="font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href={LEGAL_ROUTES.privacy}
                className="font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptedTerms ? (
            <p className="text-sm text-destructive">{errors.acceptedTerms}</p>
          ) : null}
        </div>
      ) : errors.acceptedTerms ? (
        <p className="text-sm text-destructive">{errors.acceptedTerms}</p>
      ) : null}

      {turnstileEnabled ? (
        <TurnstileWidget
          onToken={setTurnstileToken}
          resetKey={turnstileResetKey}
          className="flex justify-center"
        />
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={isLoading || turnstileMissing}
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      {afterSubmitSlot}

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
