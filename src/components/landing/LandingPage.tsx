"use client";

import { Suspense, useState } from "react";
import { ArrowRightIcon, BotIcon, MessageSquareIcon, SparklesIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { AuthModal } from "@/components/landing/AuthModal";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFeatureComparison } from "@/components/landing/LandingFeatureComparison";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  LandingLocaleProvider,
  useLandingLocale,
} from "@/components/landing/LandingLocaleProvider";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingProductPreview } from "@/components/landing/LandingProductPreview";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import type { LegalFooterLink } from "@/features/legal/types";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import {
  LANDING_BOOK_DEMO,
  LANDING_CHANNELS,
  LANDING_FEATURES,
} from "@/features/landing/constants";

const FEATURE_ICONS = [MessageSquareIcon, BotIcon, SparklesIcon] as const;

type LandingPageProps = {
  legalFooterLinks: LegalFooterLink[];
};

function LandingPageContent({ legalFooterLinks }: LandingPageProps) {
  const { copy } = useLandingLocale();
  const [authOpen, setAuthOpen] = useState(false);

  function openAuth() {
    setAuthOpen(true);
  }

  return (
    <div className="landing relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[360px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.35))]" />
      </div>

      <LandingHeader onStartFree={openAuth} />

      <main className="relative z-10 flex flex-1 flex-col items-center">
        <section className="flex w-full flex-col items-center px-6 py-12 sm:py-16">
          <div className="flex w-full max-w-3xl flex-col items-center text-center">
            <OrzuLogo size="lg" align="center" className="mb-10 sm:hidden" />

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <SparklesIcon className="size-3.5 text-primary" />
              {copy.heroBadge}
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
              {copy.tagline}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {copy.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {LANDING_CHANNELS.map((channel) => (
                <div
                  key={channel.id}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <ChannelBrandIcon channel={channel.id} className="size-7" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {channel.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {LANDING_FEATURES.map((feature, index) => {
                const Icon = FEATURE_ICONS[index] ?? SparklesIcon;

                return (
                  <div
                    key={feature}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
                  >
                    <Icon className="size-3.5 text-primary" />
                    {feature}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="cta"
                size="cta-lg"
                className="transition-all hover:scale-[1.02]"
                onClick={openAuth}
              >
                {copy.startButton}
                <ArrowRightIcon className="size-4" />
              </Button>
              <Button variant="ctaOutline" size="cta-lg" asChild>
                <a href={LANDING_BOOK_DEMO.href}>{copy.header.bookDemo}</a>
              </Button>
            </div>
          </div>
        </section>

        <LandingProductPreview />
        <LandingSocialProof />
        <LandingPricing onStartFree={openAuth} />
        <LandingFeatureComparison />
        <LandingFaq />
      </main>

      <footer className="relative z-10 space-y-3 px-6 pb-8 pt-4 text-center text-xs text-muted-foreground">
        <LegalFooterLinks links={legalFooterLinks} />
        <p>© {new Date().getFullYear()} OrzuX. Built for modern small businesses.</p>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
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
