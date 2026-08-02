import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { APP_ORIGIN } from "@/constants/app-origin";
import { APP_ROUTES } from "@/constants/routes";
import {
  buildSolutionUrl,
  resolveSolutionLocale,
  SOLUTION_PAGES,
} from "@/features/seo/solution-pages";
import { listFooterLegalLinks } from "@/services/legal-pages.service";

type SolutionsIndexProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

const COPY = {
  en: {
    title: "Solutions",
    subtitle:
      "How OrzuX helps teams sell and support customers with an AI worker, unified inbox, WhatsApp and Telegram CRM, an AI voice agent, and AI-assisted booking.",
    home: "Home",
  },
  ru: {
    title: "Решения",
    subtitle:
      "Как OrzuX помогает командам продавать и поддерживать клиентов: ИИ-работник, единый инбокс, CRM для WhatsApp и Telegram, ИИ голосовой агент и запись с помощью ИИ.",
    home: "Главная",
  },
} as const;

export async function generateMetadata({
  searchParams,
}: SolutionsIndexProps): Promise<Metadata> {
  const query = await searchParams;
  const locale = resolveSolutionLocale(query.lang);
  const copy = COPY[locale];
  const url =
    locale === "en"
      ? `${APP_ORIGIN}/solutions`
      : `${APP_ORIGIN}/solutions?lang=${locale}`;

  return {
    title: `${copy.title} | OrzuX`,
    description: copy.subtitle,
    alternates: {
      canonical: url,
      languages: {
        en: `${APP_ORIGIN}/solutions`,
        ru: `${APP_ORIGIN}/solutions?lang=ru`,
        "x-default": `${APP_ORIGIN}/solutions`,
      },
    },
  };
}

export default async function SolutionsIndexPage({
  searchParams,
}: SolutionsIndexProps) {
  const [query, footerLinks] = await Promise.all([
    searchParams,
    listFooterLegalLinks(),
  ]);
  const locale = resolveSolutionLocale(query.lang);
  const copy = COPY[locale];
  const homeHref = locale === "en" ? APP_ROUTES.home : `${APP_ROUTES.home}?lang=${locale}`;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <Link href={homeHref} aria-label="OrzuX">
            <BrandMark />
          </Link>
          <Link
            href={locale === "en" ? "/solutions?lang=ru" : "/solutions"}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {locale === "en" ? "RU" : "EN"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {copy.subtitle}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SOLUTION_PAGES.map((page) => {
            const pageCopy = page.copy[locale];
            return (
              <Link
                key={page.slug}
                href={buildSolutionUrl(page.slug, locale)}
                className="group flex flex-col rounded-xl border p-6 transition-colors hover:bg-muted"
              >
                <p className="text-lg font-medium group-hover:underline">
                  {pageCopy.h1}
                </p>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {pageCopy.subtitle}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                  {pageCopy.keyword}
                  <ArrowRightIcon className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="border-t px-6 py-8 text-center text-xs text-muted-foreground">
        <LegalFooterLinks links={footerLinks} className="mb-4" />
        <p>© {new Date().getFullYear()} OrzuX. All rights reserved.</p>
      </footer>
    </div>
  );
}
