import Link from "next/link";

import type { DocsArticle } from "@/features/docs/content";
import { DOCS_ROUTES, getDocsItem } from "@/features/docs/nav";
import { LEGAL_ROUTES } from "@/constants/routes";

type DocsArticleViewProps = {
  article: DocsArticle;
};

export function DocsArticleView({ article }: DocsArticleViewProps) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {article.updatedLabel}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-600">{article.summary}</p>

      <div className="mt-10 space-y-10">
        {article.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="text-sm leading-7 text-zinc-600">
                {renderInlineLinks(paragraph)}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-600">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{renderInlineLinks(bullet)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {article.relatedSlugs && article.relatedSlugs.length > 0 ? (
        <div className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Related
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {article.relatedSlugs.map((slug) => {
              const item = getDocsItem(slug);
              if (!item) return null;
              return (
                <li key={slug}>
                  <Link
                    href={DOCS_ROUTES.page(slug)}
                    className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:shadow-sm"
                  >
                    <span className="block text-sm font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      {item.description}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function renderInlineLinks(text: string) {
  const replacements: Array<{ match: string; href: string; label: string }> = [
    { match: "/privacy", href: LEGAL_ROUTES.privacy, label: "Privacy Policy" },
    { match: "/terms", href: LEGAL_ROUTES.terms, label: "Terms of Service" },
    {
      match: "/data-deletion",
      href: LEGAL_ROUTES.dataDeletion,
      label: "User Data Deletion",
    },
  ];

  for (const item of replacements) {
    if (text.includes(item.match)) {
      const parts = text.split(item.match);
      return (
        <>
          {parts[0]}
          <Link
            href={item.href}
            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            {item.label}
          </Link>
          {parts.slice(1).join(item.match)}
        </>
      );
    }
  }

  return text;
}
