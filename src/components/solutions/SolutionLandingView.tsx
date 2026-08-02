import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { APP_ROUTES, AUTH_ROUTES, DOCS_ROUTES } from "@/constants/routes";
import type { LegalFooterLink } from "@/features/legal/types";
import {
  buildSolutionUrl,
  getSolutionPage,
  type SolutionLocale,
  type SolutionPage,
} from "@/features/seo/solution-pages";

type UiStrings = {
  home: string;
  getStarted: string;
  readDocs: string;
  related: string;
  faq: string;
  ctaTitle: string;
  ctaBody: string;
};

const UI: Record<SolutionLocale, UiStrings> = {
  en: {
    home: "Home",
    getStarted: "Get started free",
    readDocs: "Read the docs",
    related: "Related solutions",
    faq: "Frequently asked questions",
    ctaTitle: "Ready to put OrzuX to work?",
    ctaBody:
      "Create your workspace and connect your first channel in minutes. No credit card required to start.",
  },
  ru: {
    home: "Главная",
    getStarted: "Начать бесплатно",
    readDocs: "Документация",
    related: "Похожие решения",
    faq: "Частые вопросы",
    ctaTitle: "Готовы подключить OrzuX?",
    ctaBody:
      "Создайте рабочее пространство и подключите первый канал за минуты. Для старта карта не нужна.",
  },
};

function withLang(path: string, locale: SolutionLocale): string {
  return locale === "en" ? path : `${path}?lang=${locale}`;
}

type SolutionLandingViewProps = {
  page: SolutionPage;
  locale: SolutionLocale;
  footerLinks: LegalFooterLink[];
};

export function SolutionLandingView({
  page,
  locale,
  footerLinks,
}: SolutionLandingViewProps) {
  const t = UI[locale];
  const copy = page.copy[locale];
  const related = page.relatedSlugs
    .map((slug) => getSolutionPage(slug))
    .filter((entry): entry is SolutionPage => Boolean(entry));

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <Link href={withLang(APP_ROUTES.home, locale)} aria-label="OrzuX">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href={buildSolutionUrl(page.slug, locale === "en" ? "ru" : "en")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {locale === "en" ? "RU" : "EN"}
            </Link>
            <Link
              href={withLang(AUTH_ROUTES.register, locale)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
            >
              {t.getStarted}
              <ArrowRightIcon className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-sm text-muted-foreground"
        >
          <Link
            href={withLang(APP_ROUTES.home, locale)}
            className="transition-colors hover:text-foreground"
          >
            {t.home}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{copy.keyword}</span>
        </nav>

        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {copy.h1}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{copy.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={withLang(AUTH_ROUTES.register, locale)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t.getStarted}
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href={DOCS_ROUTES.root}
              className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t.readDocs}
            </Link>
          </div>
        </section>

        <div className="mt-14 space-y-12">
          {copy.sections.map((section) => (
            <section key={section.heading} className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              {section.body.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-3 text-base leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-foreground" />
                      <span className="text-base text-muted-foreground">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {copy.faqs.length > 0 ? (
          <section className="mt-16 max-w-2xl">
            <h2 className="text-xl font-semibold tracking-tight">{t.faq}</h2>
            <dl className="mt-6 space-y-6">
              {copy.faqs.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium">{item.question}</dt>
                  <dd className="mt-1.5 text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="mt-16 rounded-2xl border bg-muted/40 p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t.ctaTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t.ctaBody}
          </p>
          <Link
            href={withLang(AUTH_ROUTES.register, locale)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t.getStarted}
            <ArrowRightIcon className="size-4" />
          </Link>
        </section>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight">
              {t.related}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => {
                const relatedCopy = entry.copy[locale];
                return (
                  <Link
                    key={entry.slug}
                    href={buildSolutionUrl(entry.slug, locale)}
                    className="group rounded-xl border p-5 transition-colors hover:bg-muted"
                  >
                    <p className="font-medium group-hover:underline">
                      {relatedCopy.h1}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {relatedCopy.subtitle}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t px-6 py-8 text-center text-xs text-muted-foreground">
        <LegalFooterLinks links={footerLinks} className="mb-4" />
        <p>© {new Date().getFullYear()} OrzuX. All rights reserved.</p>
      </footer>
    </div>
  );
}
