"use client";

import Link from "next/link";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { AUTH_ROUTES } from "@/constants/routes";
import type { LegalFooterLink } from "@/features/legal/types";

type LandingFooterProps = {
  legalFooterLinks: LegalFooterLink[];
};

const SOLUTIONS_LABEL: Record<string, string> = {
  en: "Solutions",
  ru: "Решения",
  uz: "Yechimlar",
};

export function LandingFooter({ legalFooterLinks }: LandingFooterProps) {
  const { copy, locale } = useLandingLocale();
  const solutionsHref =
    locale === "en" ? "/solutions" : `/solutions?lang=${locale}`;
  const solutionsLabel = SOLUTIONS_LABEL[locale] ?? SOLUTIONS_LABEL.en;

  return (
    <footer
      id="footer"
      className="landing-dark-band w-full border-t border-white/10 px-4 py-12 text-white sm:px-6"
      role="contentinfo"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <OrzuLogo align="left" tone="on-dark" />
          <p className="mt-5 max-w-md text-sm leading-7 text-white/62">
            {copy.footer.tagline}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {copy.footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold uppercase text-white/46">
                {column.title}
              </p>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-white/72 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={AUTH_ROUTES.login} className="transition hover:text-white">
            {copy.header.login}
          </Link>
          <Link href={solutionsHref} className="transition hover:text-white">
            {solutionsLabel}
          </Link>
          <LegalFooterLinks links={legalFooterLinks} />
        </div>
        <span>&copy; {new Date().getFullYear()} OrzuX</span>
      </div>
    </footer>
  );
}
