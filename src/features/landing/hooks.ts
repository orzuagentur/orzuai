"use client";

import { useEffect } from "react";

import { resolveLandingLocale } from "@/features/landing/i18n";

export function useDocumentLang(langParam: string | null) {
  useEffect(() => {
    const locale = resolveLandingLocale(langParam);
    document.documentElement.lang = locale;
  }, [langParam]);
}
