import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsArticleView } from "@/components/docs/DocsArticleView";
import { DocsShell } from "@/components/docs/DocsShell";
import { getDocsArticle } from "@/features/docs/content";
import { getDocsSlugs, getDocsItem } from "@/features/docs/nav";
import { getCmsDocsArticle } from "@/services/site-content.service";

type DocsPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getDocsSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cms = await getCmsDocsArticle(slug);
  const article = cms ?? getDocsArticle(slug);
  const navItem = getDocsItem(slug);

  if (!article || !navItem) {
    return { title: "Documentation" };
  }

  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function DocsArticlePage({ params }: DocsPageProps) {
  const { slug } = await params;
  const cms = await getCmsDocsArticle(slug);
  const article = cms ?? getDocsArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <DocsShell activeSlug={slug}>
      <DocsArticleView article={article} />
    </DocsShell>
  );
}
