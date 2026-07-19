"use client";

import { ThemeProvider } from "next-themes";

import { ConsentAwareAnalytics } from "@/components/ConsentAwareAnalytics";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { PushServiceWorkerBootstrap } from "@/components/pwa/PushServiceWorkerBootstrap";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
    >
      <TooltipProvider delayDuration={0}>
        <PushServiceWorkerBootstrap />
        <ConsentAwareAnalytics />
        {children}
        <CookieConsentBanner />
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
