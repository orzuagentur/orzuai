"use client";

import Link from "next/link";

import { LandingLanguageSwitcher } from "@/components/landing/LandingLanguageSwitcher";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/constants/routes";
import { LANDING_BOOK_DEMO } from "@/features/landing/constants";

type LandingHeaderProps = {
  onStartFree: () => void;
};

export function LandingHeader({ onStartFree }: LandingHeaderProps) {
  const { copy } = useLandingLocale();

  return (
    <header className="relative z-20 flex w-full items-center justify-between px-6 py-5">
      <OrzuLogo align="left" />
      <div className="flex items-center gap-2 sm:gap-3">
        <LandingLanguageSwitcher />
        <Button
          variant="ghost"
          className="text-landing-foreground hover:bg-white/10 hover:text-landing-foreground"
          asChild
        >
          <Link href={AUTH_ROUTES.login}>{copy.header.login}</Link>
        </Button>
        <Button variant="ctaOutline" size="cta" asChild>
          <a href={LANDING_BOOK_DEMO.href}>{copy.header.bookDemo}</a>
        </Button>
        <Button type="button" variant="cta" size="cta" onClick={onStartFree}>
          {copy.header.startFree}
        </Button>
      </div>
    </header>
  );
}
