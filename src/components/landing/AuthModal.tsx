"use client";

import { useState } from "react";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { EmailRegistrationForm } from "@/components/auth/EmailRegistrationForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LEGAL_ROUTES } from "@/constants/routes";
import { LANDING_COPY } from "@/features/landing/constants";
import { cn } from "@/lib/utils";

type AuthView = "login" | "register";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [view, setView] = useState<AuthView>("login");

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setView("login");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle>{LANDING_COPY.modalTitle}</DialogTitle>
          <DialogDescription>{LANDING_COPY.modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  view === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <GoogleSignInButton />

          {view === "register" ? (
            <p className="text-center text-xs leading-5 text-muted-foreground">
              By continuing, you agree to our{" "}
              <a
                href={LEGAL_ROUTES.terms}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={LEGAL_ROUTES.privacy}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or email
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
