"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback } from "react";

import { LandingArchitecture } from "@/components/landing/LandingArchitecture";
import { LandingCursorAura } from "@/components/landing/LandingCursorAura";
import { LandingEnterprise } from "@/components/landing/LandingEnterprise";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingLocaleProvider } from "@/components/landing/LandingLocaleProvider";
import { LandingMinimalHero } from "@/components/landing/LandingMinimalHero";
import {
  LandingPricing,
  type LandingPlanCard,
} from "@/components/landing/LandingPricing";
import { LandingProductShowcase } from "@/components/landing/LandingProductShowcase";
import { LandingSkipLink } from "@/components/landing/LandingSkipLink";
import { LandingSolutions } from "@/components/landing/LandingSolutions";
import { LandingTrustBar } from "@/components/landing/LandingTrustBar";
import { AUTH_ROUTES } from "@/constants/routes";
import type { LandingCopy } from "@/features/landing/i18n";
import type { LegalFooterLink } from "@/features/legal/types";

type LandingPageProps = {
  legalFooterLinks: LegalFooterLink[];
  plans: LandingPlanCard[];
  copyOverride?: LandingCopy | null;
};

function LandingPageContent({
  legalFooterLinks,
  plans,
}: Omit<LandingPageProps, "copyOverride">) {
  const router = useRouter();
  const goRegister = useCallback(() => {
    router.push(AUTH_ROUTES.register);
  }, [router]);

  return (
    <div className="landing landing-art-shell relative flex min-h-full flex-1 flex-col overflow-x-hidden">
      <div className="landing-grid-wash pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <LandingCursorAura />
      <LandingSkipLink />
      <LandingHeader onStartFree={goRegister} />

      <main id="main-content" className="relative z-10 flex w-full flex-1 flex-col">
        <LandingMinimalHero onStartFree={goRegister} />
        <LandingTrustBar />
        <LandingProductShowcase />
        <LandingSolutions />
        <LandingArchitecture />
        <LandingEnterprise />
        <LandingPricing onStartFree={goRegister} plans={plans} />
        <section id="faq" aria-labelledby="faq-heading" className="w-full bg-white/35">
          <LandingFaq />
        </section>
        <LandingFinalCta onStartFree={goRegister} />
      </main>

      <LandingFooter legalFooterLinks={legalFooterLinks} />
    </div>
  );
}

export function LandingPage({
  legalFooterLinks,
  plans,
  copyOverride = null,
}: LandingPageProps) {
  return (
    <Suspense fallback={null}>
      <LandingLocaleProvider copyOverride={copyOverride}>
        <LandingPageContent legalFooterLinks={legalFooterLinks} plans={plans} />
      </LandingLocaleProvider>
    </Suspense>
  );
}
