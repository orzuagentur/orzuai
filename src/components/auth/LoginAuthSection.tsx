"use client";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Separator } from "@/components/ui/separator";

type LoginAuthSectionProps = {
  nextPath?: string;
};

export function LoginAuthSection({ nextPath }: LoginAuthSectionProps) {
  return (
    <div className="space-y-6">
      <GoogleSignInButton
        nextPath={nextPath}
        className="h-11 border-border/80 bg-card/80 shadow-sm hover:bg-secondary/70"
      />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          or email
        </span>
        <Separator className="flex-1" />
      </div>
      <EmailLoginForm nextPath={nextPath} />
    </div>
  );
}
