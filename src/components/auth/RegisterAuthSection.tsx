"use client";

import { useState } from "react";

import { EmailRegistrationForm } from "@/components/auth/EmailRegistrationForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { TermsAcceptanceField } from "@/components/auth/TermsAcceptanceField";
import { Separator } from "@/components/ui/separator";

export function RegisterAuthSection() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <div className="space-y-6">
      <EmailRegistrationForm
        acceptedTerms={acceptedTerms}
        hideTermsField
        termsSlot={
          <TermsAcceptanceField
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
          />
        }
        afterSubmitSlot={
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                or continue with
              </span>
              <Separator className="flex-1" />
            </div>
            <GoogleSignInButton
              disabled={!acceptedTerms}
              className="h-11 border-border/80 bg-white shadow-sm hover:bg-secondary/70"
            />
          </>
        }
      />
    </div>
  );
}
