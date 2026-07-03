"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";

import { LandingArchitecture } from "@/components/landing/LandingArchitecture";
import { LandingEnterprise } from "@/components/landing/LandingEnterprise";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingLocaleProvider } from "@/components/landing/LandingLocaleProvider";
import { LandingMinimalHero } from "@/components/landing/LandingMinimalHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingProductShowcase } from "@/components/landing/LandingProductShowcase";
import { LandingSkipLink } from "@/components/landing/LandingSkipLink";
import { LandingSolutions } from "@/components/landing/LandingSolutions";
import { LandingTrustBar } from "@/components/landing/LandingTrustBar";
import type { LegalFooterLink } from "@/features/legal/types";

const AuthModal = dynamic(
  () => import("@/components/landing/AuthModal").then((module) => module.AuthModal),
  { ssr: false },
);

type LandingPageProps = {
  legalFooterLinks: LegalFooterLink[];
};

function LandingPageContent({ legalFooterLinks }: LandingPageProps) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="landing relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#f7f9f6] text-[#101815]">
      <LandingSkipLink />
      <LandingHeader onStartFree={() => setAuthOpen(true)} />

      <main id="main-content" className="relative z-10 flex w-full flex-1 flex-col">
        <LandingMinimalHero onStartFree={() => setAuthOpen(true)} />
        <LandingTrustBar />
        <LandingProductShowcase />
        <LandingSolutions />
        <LandingArchitecture />
        <LandingEnterprise />
        <LandingPricing onStartFree={() => setAuthOpen(true)} />
        <section id="faq" aria-labelledby="faq-heading" className="w-full bg-[#eef3ef]">
          <LandingFaq />
        </section>
        <LandingFinalCta onStartFree={() => setAuthOpen(true)} />
      </main>

      <LandingFooter legalFooterLinks={legalFooterLinks} />

      {authOpen ? <AuthModal open={authOpen} onOpenChange={setAuthOpen} /> : null}
    </div>
  );
}

export function LandingPage({ legalFooterLinks }: LandingPageProps) {
  return (
    <Suspense fallback={null}>
      <LandingLocaleProvider>
        <LandingPageContent legalFooterLinks={legalFooterLinks} />
      </LandingLocaleProvider>
    </Suspense>
  );
}
