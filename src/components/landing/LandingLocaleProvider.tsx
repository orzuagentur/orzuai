"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import {
  LANDING_I18N,
  resolveLandingLocale,
  type LandingLocale,
} from "@/features/landing/i18n";

type LandingLocaleContextValue = {
  locale: LandingLocale;
  copy: (typeof LANDING_I18N)[LandingLocale];
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(
  null,
);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const locale = resolveLandingLocale(searchParams.get("lang"));

  const value = useMemo(
    () => ({
      locale,
      copy: LANDING_I18N[locale],
    }),
    [locale],
  );

  return (
    <LandingLocaleContext.Provider value={value}>
      {children}
    </LandingLocaleContext.Provider>
  );
}

export function useLandingLocale(): LandingLocaleContextValue {
  const context = useContext(LandingLocaleContext);

  if (!context) {
    return {
      locale: "en",
      copy: LANDING_I18N.en,
    };
  }

  return context;
}
