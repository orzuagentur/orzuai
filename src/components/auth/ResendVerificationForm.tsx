"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResendVerificationEmail } from "@/hooks/use-resend-verification-email";
import { cn } from "@/lib/utils";

type ResendVerificationFormProps = {
  email: string;
  className?: string;
};

export function ResendVerificationForm({
  email,
  className,
}: ResendVerificationFormProps) {
  const { resend, isLoading } = useResendVerificationEmail();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      disabled={isLoading}
      onClick={() => {
        void resend({ email });
      }}
    >
      {isLoading ? (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Resend verification email"
      )}
    </Button>
  );
}

type ResendVerificationEmailFieldProps = {
  defaultEmail?: string;
  className?: string;
};

export function ResendVerificationEmailField({
  defaultEmail = "",
  className,
}: ResendVerificationEmailFieldProps) {
  const { resend, isLoading } = useResendVerificationEmail();
  const [email, setEmail] = useState(defaultEmail);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="resend-email">Email</Label>
      <Input
        id="resend-email"
        type="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
        placeholder="you@company.com"
        disabled={isLoading}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading || !email.trim()}
        onClick={() => {
          void resend({ email });
        }}
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>
    </div>
  );
}
