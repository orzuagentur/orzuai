"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  BookOpenIcon,
  FileTextIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ensureSiteContentCatalogAction } from "@/features/site-content/actions";
import {
  SITE_CONTENT_CATALOG,
  SITE_CONTENT_LOCALE_LABELS,
} from "@/features/site-content/catalog";
import type { SiteDocumentRecord } from "@/features/site-content/types";

type SiteContentIndexProps = {
  documents: SiteDocumentRecord[];
  locale: "en" | "ru" | "uz";
};

const GROUP_META = {
  landing: {
    title: "Welcome page",
    hint: "Hero, Architecture, Enterprise, Pricing labels",
    icon: SparklesIcon,
  },
  faq: {
    title: "FAQ",
    hint: "Questions on the welcome page",
    icon: FileTextIcon,
  },
  docs: {
    title: "Documentation",
    hint: "Every /docs page — full screen editor",
    icon: BookOpenIcon,
  },
} as const;

export function SiteContentIndex({
  documents,
  locale,
}: SiteContentIndexProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const byKey = new Map(
    documents.map((doc) => [`${doc.collection}:${doc.docKey}`, doc]),
  );

  function seedCatalog() {
    startTransition(async () => {
      const result = await ensureSiteContentCatalogAction(locale);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.created > 0
          ? `Created ${result.created} editable documents`
          : "Catalog already complete",
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Studio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Edit welcome-page copy, FAQ, and documentation in a full-screen
            Word-like editor — not cramped cards. Tariff prices sync from{" "}
            <Link href="/billing/plans" className="font-medium text-foreground underline">
              Billing → Tariffs
            </Link>{" "}
            to the public Pricing section automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SITE_CONTENT_LOCALE_LABELS) as Array<"en" | "ru" | "uz">).map(
            (code) => (
              <Link
                key={code}
                href={`/content?locale=${code}`}
                className={
                  code === locale
                    ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-lg border px-3 py-1.5 text-sm"
                }
              >
                {SITE_CONTENT_LOCALE_LABELS[code]}
              </Link>
            ),
          )}
          <button
            type="button"
            onClick={seedCatalog}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : null}
            Ensure catalog
          </button>
        </div>
      </div>

      {(["landing", "faq", "docs"] as const).map((collection) => {
        const meta = GROUP_META[collection];
        const Icon = meta.icon;
        const items = SITE_CONTENT_CATALOG.filter(
          (item) => item.collection === collection,
        );

        return (
          <section key={collection} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {meta.title}
                </h2>
                <p className="text-xs text-muted-foreground">{meta.hint}</p>
              </div>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {items.map((item) => {
                const existing = byKey.get(`${item.collection}:${item.docKey}`);
                return (
                  <li key={`${item.collection}:${item.docKey}`}>
                    {existing ? (
                      <Link
                        href={`/content/${existing.id}`}
                        className="flex items-start justify-between gap-4 px-4 py-4 transition hover:bg-muted/50"
                      >
                        <span>
                          <span className="block text-sm font-semibold">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Open editor →
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-start justify-between gap-4 px-4 py-4 opacity-60">
                        <span>
                          <span className="block text-sm font-semibold">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            Not created yet — click Ensure catalog
                          </span>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
