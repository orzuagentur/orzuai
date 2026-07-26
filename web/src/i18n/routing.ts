import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ru", "de"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  /** Always prefix for clear hreflang / Search Console URLs */
  localePrefix: "always",
  localeDetection: true,
});

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
};

export const ogLocale: Record<AppLocale, string> = {
  en: "en_US",
  ru: "ru_RU",
  de: "de_DE",
};
