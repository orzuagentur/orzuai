"use client";

import { useState } from "react";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { EmailRegistrationForm } from "@/components/auth/EmailRegistrationForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { TermsAcceptanceField } from "@/components/auth/TermsAcceptanceField";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type AuthView = "login" | "register";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { copy } = useLandingLocale();
  const [view, setView] = useState<AuthView>("register");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setView("register");
      setAcceptedTerms(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/70 bg-card/95 shadow-[0_28px_90px_rgba(18,60,53,0.18)] sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle>{copy.auth.modalTitle}</DialogTitle>
          <DialogDescription>{copy.auth.modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div
            className="grid grid-cols-2 rounded-lg border border-border/70 bg-muted/70 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={view === tab}
                onClick={() => setView(tab)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  view === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "login" ? copy.auth.signIn : copy.auth.createAccount}
              </button>
            ))}
          </div>

          {view === "register" ? (
            <TermsAcceptanceField
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
            />
          ) : null}

          <GoogleSignInButton disabled={view === "register" && !acceptedTerms} />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {copy.auth.orEmail}
            </span>
            <Separator className="flex-1" />
          </div>

          {view === "login" ? (
            <EmailLoginForm onCreateAccountClick={() => setView("register")} />
          ) : (
            <EmailRegistrationForm onSignInClick={() => setView("login")} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
