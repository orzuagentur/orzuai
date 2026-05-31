"use client";

import { useState } from "react";
import { ArrowRightIcon, BotIcon, MessageSquareIcon, SparklesIcon } from "lucide-react";

import { AuthModal } from "@/components/landing/AuthModal";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import {
  LANDING_COPY,
  LANDING_FEATURES,
} from "@/features/landing/constants";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = [MessageSquareIcon, BotIcon, SparklesIcon] as const;

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="landing relative flex min-h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[360px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.35))]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-3xl flex-col items-center text-center">
          <OrzuLogo size="lg" align="center" className="mb-10" />

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <SparklesIcon className="size-3.5 text-primary" />
            AI WhatsApp platform for small business
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
            {LANDING_COPY.tagline}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {LANDING_COPY.subtitle}
          </p>

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

          <Button
            type="button"
            size="lg"
            className={cn(
              "mt-12 h-14 min-w-[220px] rounded-full px-10 text-base font-semibold tracking-[0.2em]",
              "shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-primary/40",
            )}
            onClick={() => setAuthOpen(true)}
          >
            {LANDING_COPY.startButton}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OrzuAI. Built for modern small businesses.
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
