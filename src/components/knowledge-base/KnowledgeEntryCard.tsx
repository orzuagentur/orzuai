"use client";

import { useState } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";

import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KNOWLEDGE_CATEGORY_META, isKnowledgeCategory } from "@/features/knowledge-base/categories";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { useDeleteKnowledgeEntry } from "@/hooks/use-delete-knowledge-entry";
import { truncateKnowledgeContent } from "@/utils/knowledge";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

type KnowledgeEntryCardProps = {
  entry: KnowledgeEntryData;
  onMutated: () => void;
};

export function KnowledgeEntryCard({
  entry,
  onMutated,
}: KnowledgeEntryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { remove, isDeleting } = useDeleteKnowledgeEntry({
    onSuccess: () => {
      setDeleteOpen(false);
      onMutated();
    },
  });

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{entry.title}</CardTitle>
              <Badge variant="secondary">
                {isKnowledgeCategory(entry.category)
                  ? KNOWLEDGE_CATEGORY_META[entry.category].label
                  : entry.category}
              </Badge>
            {entry.source === "website_sync" ? (
              <Badge variant="outline">Website sync</Badge>
            ) : null}
            </div>
            <CardDescription>
              Updated {new Date(entry.updatedAt).toLocaleDateString("en-US")}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
              aria-label={`Edit ${entry.title}`}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Delete ${entry.title}`}
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {truncateKnowledgeContent(entry.content)}
          </p>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.editTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.createDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeEntryForm
            key={entry.id}
            entry={entry}
            onSuccess={() => {
              setEditOpen(false);
              onMutated();
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void remove(entry.id);
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
