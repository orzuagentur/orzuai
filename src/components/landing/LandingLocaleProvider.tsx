"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { useDocumentLang } from "@/features/landing/hooks";
import { getLandingArchitecture } from "@/features/landing/live-copy";
import {
  getLandingCopy,
  resolveLandingLocale,
  type LandingCopy,
  type LandingLocale,
} from "@/features/landing/i18n";

type LandingLocaleContextValue = {
  locale: LandingLocale;
  copy: LandingCopy;
  architecture: ReturnType<typeof getLandingArchitecture>;
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(null);

type LandingLocaleProviderProps = {
  children: ReactNode;
  /** Server-merged CMS overrides for the active locale. */
  copyOverride?: LandingCopy | null;
};

export function LandingLocaleProvider({
  children,
  copyOverride = null,
}: LandingLocaleProviderProps) {
  const searchParams = useSearchParams();
  const locale = resolveLandingLocale(searchParams.get("lang"));

  useDocumentLang(searchParams.get("lang"));

  const value = useMemo(() => {
    const copy = copyOverride ?? getLandingCopy(locale);
    return {
      locale,
      copy,
      architecture: copy.architecture,
    };
  }, [locale, copyOverride]);

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
