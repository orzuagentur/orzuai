import Link from "next/link";

import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/constants/routes";
import { LANDING_BOOK_DEMO, LANDING_HEADER } from "@/features/landing/constants";

type LandingHeaderProps = {
  onStartFree: () => void;
};

export function LandingHeader({ onStartFree }: LandingHeaderProps) {
  return (
    <header className="relative z-20 flex w-full items-center justify-between px-6 py-5">
      <OrzuLogo align="left" />
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          className="text-landing-foreground hover:bg-white/10 hover:text-landing-foreground"
          asChild
        >
          <Link href={AUTH_ROUTES.login}>{LANDING_HEADER.login}</Link>
        </Button>
        <Button variant="ctaOutline" size="cta" asChild>
          <a href={LANDING_BOOK_DEMO.href}>{LANDING_HEADER.bookDemo}</a>
        </Button>
        <Button type="button" variant="cta" size="cta" onClick={onStartFree}>
          {LANDING_HEADER.startFree}
        </Button>
      </div>
    </header>
  );
}
