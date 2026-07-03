"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { KNOWLEDGE_CATEGORY_META } from "@/features/knowledge-base/categories";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { useDeleteKnowledgeEntry } from "@/hooks/use-delete-knowledge-entry";
import { truncateKnowledgeContent } from "@/utils/knowledge";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

type SortKey = "updatedAt" | "title" | "category";
type SortDirection = "asc" | "desc";

type KnowledgeEntriesTableProps = {
  entries: KnowledgeEntryData[];
  hasActiveFilters: boolean;
  onAddFirstEntry?: () => void;
  onMutated: () => void;
};

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ArrowDownIcon className="size-3.5" />
        )
      ) : null}
    </button>
  );
}

export function KnowledgeEntriesTable({
  entries,
  hasActiveFilters,
  onAddFirstEntry,
  onMutated,
}: KnowledgeEntriesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editEntry, setEditEntry] = useState<KnowledgeEntryData | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<KnowledgeEntryData | null>(null);
  const { remove, isDeleting } = useDeleteKnowledgeEntry({
    onSuccess: () => {
      setDeleteEntry(null);
      onMutated();
    },
  });

  const sortedEntries = useMemo(() => {
    const copy = [...entries];

    copy.sort((a, b) => {
      let comparison = 0;

      if (sortKey === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortKey === "category") {
        comparison = a.category.localeCompare(b.category);
      } else {
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return copy;
  }, [entries, sortDirection, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "updatedAt" ? "desc" : "asc");
  }

  if (sortedEntries.length === 0) {
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
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b bg-muted/30">
            <tr className="text-left">
              <th className="px-4 py-3">
                <SortButton
                  label={KNOWLEDGE_MESSAGES.sortTitle}
                  active={sortKey === "title"}
                  direction={sortDirection}
                  onClick={() => toggleSort("title")}
                />
              </th>
              <th className="px-4 py-3">
                <SortButton
                  label={KNOWLEDGE_MESSAGES.sortCategory}
                  active={sortKey === "category"}
                  direction={sortDirection}
                  onClick={() => toggleSort("category")}
                />
              </th>
              <th className="px-4 py-3">Content</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">
                <SortButton
                  label={KNOWLEDGE_MESSAGES.sortUpdated}
                  active={sortKey === "updatedAt"}
                  direction={sortDirection}
                  onClick={() => toggleSort("updatedAt")}
                />
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => {
              const categoryMeta = KNOWLEDGE_CATEGORY_META[entry.category];

              return (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="max-w-[14rem] px-4 py-3 align-top font-medium">
                    {entry.title}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${categoryMeta.tone}`}
                    >
                      {categoryMeta.label}
                    </span>
                  </td>
                  <td className="max-w-[20rem] px-4 py-3 align-top text-muted-foreground">
                    {truncateKnowledgeContent(entry.content, 120)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge variant="outline">
                      {entry.source === "website_sync"
                        ? KNOWLEDGE_MESSAGES.sourceWebsite
                        : KNOWLEDGE_MESSAGES.sourceManual}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                    {new Date(entry.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditEntry(entry)}
                        aria-label={`Edit ${entry.title}`}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteEntry(entry)}
                        aria-label={`Delete ${entry.title}`}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editEntry)} onOpenChange={() => setEditEntry(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.editTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.createDescription}
            </DialogDescription>
          </DialogHeader>
          {editEntry ? (
            <KnowledgeEntryForm
              key={editEntry.id}
              entry={editEntry}
              onSuccess={() => {
                setEditEntry(null);
                onMutated();
              }}
              onCancel={() => setEditEntry(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteEntry)}
        onOpenChange={() => setDeleteEntry(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.deleteTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.deleteDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteEntry(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || !deleteEntry}
              onClick={() => {
                if (deleteEntry) {
                  void remove(deleteEntry.id);
                }
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete entry"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
