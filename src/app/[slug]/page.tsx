import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY } from "@/features/legal/constants";
import {
  getPublishedLegalPageBySlug,
  listFooterLegalLinks,
  listPublishedLegalSlugs,
} from "@/services/legal-pages.service";

export const dynamic = "force-dynamic";

type LegalSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await listPublishedLegalSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: LegalSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedLegalPageBySlug(slug);

  if (!page) {
    return { title: `Not Found | ${LEGAL_COMPANY.name}` };
  }

  return {
    title: `${page.title} | ${LEGAL_COMPANY.name}`,
    description: page.description,
  };
}

export default async function LegalSlugPage({ params }: LegalSlugPageProps) {
  const { slug } = await params;
  const [page, footerLinks] = await Promise.all([
    getPublishedLegalPageBySlug(slug),
    listFooterLegalLinks(),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <LegalPageShell
      title={page.title}
      description={page.description}
      footerLinks={footerLinks}
    >
      <LegalDocument sections={page.sections} />
    </LegalPageShell>
  );
}
