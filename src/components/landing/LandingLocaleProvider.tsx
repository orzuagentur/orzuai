"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { useDocumentLang } from "@/features/landing/hooks";
import { getLandingArchitecture } from "@/features/landing/live-copy";
import {
  getLandingCopy,
  resolveLandingLocale,
  type LandingLocale,
} from "@/features/landing/i18n";

type LandingLocaleContextValue = {
  locale: LandingLocale;
  copy: ReturnType<typeof getLandingCopy>;
  architecture: ReturnType<typeof getLandingArchitecture>;
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(null);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const locale = resolveLandingLocale(searchParams.get("lang"));

  useDocumentLang(searchParams.get("lang"));

  const value = useMemo(
    () => ({
      locale,
      copy: getLandingCopy(locale),
      architecture: getLandingArchitecture(locale),
    }),
    [locale],
  );

  return (
    <LandingLocaleContext.Provider value={value}>{children}</LandingLocaleContext.Provider>
  );
}

export function useLandingLocale(): LandingLocaleContextValue {
  const context = useContext(LandingLocaleContext);

  if (!context) {
    return {
      locale: "en",
      copy: getLandingCopy("en"),
      architecture: getLandingArchitecture("en"),
    };
  }

  return context;
}
