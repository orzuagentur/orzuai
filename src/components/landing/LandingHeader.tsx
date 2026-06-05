import Link from "next/link";

import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/constants/routes";
import { LANDING_HEADER } from "@/features/landing/constants";

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
        <Button
          type="button"
          className="rounded-full px-5 shadow-lg shadow-primary/25"
          onClick={onStartFree}
        >
          {LANDING_HEADER.startFree}
        </Button>
      </div>
    </header>
  );
}
