"use client";

import Link from "next/link";

import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { APP_ROUTES } from "@/constants/routes";

type LoginAuthSectionProps = {
  nextPath?: string;
};

export function LoginAuthSection({ nextPath }: LoginAuthSectionProps) {
  return (
    <div className="space-y-6">
      <GoogleSignInButton nextPath={nextPath} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or email
        </span>
        <Separator className="flex-1" />
      </div>
      <EmailLoginForm nextPath={nextPath} />
      <Button asChild variant="ghost" className="w-full">
        <Link href={APP_ROUTES.home}>Back to home</Link>
      </Button>
    </div>
  );
}
