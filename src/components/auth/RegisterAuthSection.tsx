"use client";

import Link from "next/link";
import { useState } from "react";

import { EmailRegistrationForm } from "@/components/auth/EmailRegistrationForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { TermsAcceptanceField } from "@/components/auth/TermsAcceptanceField";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { APP_ROUTES } from "@/constants/routes";

export function RegisterAuthSection() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <div className="space-y-6">
      <TermsAcceptanceField
        checked={acceptedTerms}
        onChange={setAcceptedTerms}
      />
      <GoogleSignInButton disabled={!acceptedTerms} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or email
        </span>
        <Separator className="flex-1" />
      </div>
      <EmailRegistrationForm />
      <Button asChild variant="ghost" className="w-full">
        <Link href={APP_ROUTES.home}>Back to home</Link>
      </Button>
    </div>
  );
}
