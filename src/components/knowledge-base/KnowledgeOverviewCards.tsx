"use client";

import { cn } from "@/lib/utils";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_META,
} from "@/features/knowledge-base/categories";
import { useKnowledgeSearch } from "@/hooks/use-knowledge-search";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import type { KnowledgeCategoryId } from "@/features/knowledge-base/categories";

type KnowledgeOverviewCardsProps = {
  entries: KnowledgeEntryData[];
  className?: string;
};

export function KnowledgeOverviewCards({
  entries,
  className,
}: KnowledgeOverviewCardsProps) {
  const { currentCategory, applyCategoryFilter } = useKnowledgeSearch();

  const counts = KNOWLEDGE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = entries.filter((entry) => entry.category === category).length;
      return acc;
    },
    {} as Record<KnowledgeCategoryId, number>,
  );

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {KNOWLEDGE_CATEGORIES.map((category) => {
        const meta = KNOWLEDGE_CATEGORY_META[category];
        const active = currentCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() =>
              applyCategoryFilter(active ? "" : category)
            }
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40",
              active && "border-primary ring-2 ring-primary/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                  meta.tone,
                )}
              >
                {meta.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {counts[category]}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
