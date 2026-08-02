import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SolutionLandingView } from "@/components/solutions/SolutionLandingView";
import {
  buildSolutionHreflangAlternates,
  buildSolutionStructuredData,
  buildSolutionUrl,
  getSolutionPage,
  getSolutionSlugs,
  resolveSolutionLocale,
} from "@/features/seo/solution-pages";
import { listFooterLegalLinks } from "@/services/legal-pages.service";

type SolutionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export function generateStaticParams() {
  return getSolutionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: SolutionPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = getSolutionPage(slug);

  if (!page) {
    return { title: "Not Found" };
  }

  const locale = resolveSolutionLocale(query.lang);
  const copy = page.copy[locale];
  const url = buildSolutionUrl(slug, locale);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: [copy.keyword, "OrzuX", "AI communication platform"],
    alternates: {
      canonical: url,
      languages: buildSolutionHreflangAlternates(slug),
    },
    openGraph: {
      type: "website",
      url,
      siteName: "OrzuX",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
  };
}

export default async function SolutionPage({
  params,
  searchParams,
}: SolutionPageProps) {
  const [{ slug }, query, footerLinks] = await Promise.all([
    params,
    searchParams,
    listFooterLegalLinks(),
  ]);

  const page = getSolutionPage(slug);

  if (!page) {
    notFound();
  }

  const locale = resolveSolutionLocale(query.lang);
  const structuredData = buildSolutionStructuredData(page, locale);

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <SolutionLandingView page={page} locale={locale} footerLinks={footerLinks} />
    </>
  );
}
