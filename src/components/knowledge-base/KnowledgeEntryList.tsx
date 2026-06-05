"use client";

import { useRouter } from "next/navigation";

import { KnowledgeEntryCard } from "@/components/knowledge-base/KnowledgeEntryCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card className="shadow-none">
        <CardHeader className="text-center">
          <CardTitle>
            {hasActiveFilters
              ? KNOWLEDGE_MESSAGES.emptySearchTitle
              : KNOWLEDGE_MESSAGES.emptyTitle}
          </CardTitle>
          <CardDescription>
            {hasActiveFilters
              ? KNOWLEDGE_MESSAGES.emptySearchDescription
              : KNOWLEDGE_MESSAGES.emptyDescription}
          </CardDescription>
        </CardHeader>
        {!hasActiveFilters && onAddFirstEntry ? (
          <CardContent className="flex justify-center pb-6">
            <Button type="button" onClick={onAddFirstEntry}>
              Add first entry
            </Button>
          </CardContent>
        ) : null}
      </Card>
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
