"use client";

import { useRouter } from "next/navigation";

import { KnowledgeEntryCard } from "@/components/knowledge-base/KnowledgeEntryCard";
import { EmptyState } from "@/components/ui/empty-state";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

type KnowledgeEntryListProps = {
  entries: KnowledgeEntryData[];
  hasActiveFilters: boolean;
  onAddFirstEntry?: () => void;
};

export function KnowledgeEntryList({
  entries,
  hasActiveFilters,
  onAddFirstEntry,
}: KnowledgeEntryListProps) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <EmptyState
        variant="knowledge"
        title={
          hasActiveFilters
            ? KNOWLEDGE_MESSAGES.emptySearchTitle
            : KNOWLEDGE_MESSAGES.emptyTitle
        }
        description={
          hasActiveFilters
            ? KNOWLEDGE_MESSAGES.emptySearchDescription
            : KNOWLEDGE_MESSAGES.emptyDescription
        }
        actionLabel={!hasActiveFilters ? "Add first entry" : undefined}
        onAction={!hasActiveFilters ? onAddFirstEntry : undefined}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {entries.map((entry) => (
        <KnowledgeEntryCard
          key={entry.id}
          entry={entry}
          onMutated={() => router.refresh()}
        />
      ))}
    </div>
  );
}
