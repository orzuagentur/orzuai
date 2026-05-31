"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
import { KnowledgeEntryList } from "@/components/knowledge-base/KnowledgeEntryList";
import { KnowledgeSearchBar } from "@/components/knowledge-base/KnowledgeSearchBar";
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
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

type KnowledgeBasePanelProps = {
  entries: KnowledgeEntryData[];
  hasActiveFilters: boolean;
  hasBusiness: boolean;
};

export function KnowledgeBasePanel({
  entries,
  hasActiveFilters,
  hasBusiness,
}: KnowledgeBasePanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function handleRefresh() {
    router.refresh();
  }

  if (!hasBusiness) {
    return (
      <Card className="mx-auto max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{KNOWLEDGE_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {KNOWLEDGE_MESSAGES.noBusinessDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <KnowledgeSearchBar className="flex-1" />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Add entry
        </Button>
      </div>

      <KnowledgeEntryList entries={entries} hasActiveFilters={hasActiveFilters} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.createTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.createDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeEntryForm
            onSuccess={() => {
              setCreateOpen(false);
              handleRefresh();
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
