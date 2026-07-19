"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePasswordReset } from "@/hooks/use-password-reset";
import { cn } from "@/lib/utils";

type ResetPasswordFormProps = {
  className?: string;
};

type FormErrors = {
  password?: string;
  confirmPassword?: string;
};

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [password, setPassword] = useState("");
  const { resetPassword, isLoading } = usePasswordReset();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const nextPassword = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const result = await resetPassword({
      password: nextPassword,
      confirmPassword,
    });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("confirm")) {
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
        <Label htmlFor="reset-password">New password</Label>
        <PasswordInput
          id="reset-password"
          name="password"
          autoComplete="new-password"
          placeholder="5 letters · 3 symbols · 2 digits"
          disabled={isLoading}
          aria-invalid={Boolean(errors.password)}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrengthMeter password={password} />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat your new password"
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
            Updating password...
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
