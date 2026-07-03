"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  BotIcon,
  DatabaseIcon,
  FileUpIcon,
  GlobeIcon,
  PlusIcon,
} from "lucide-react";

import { KnowledgeAiStudioCard } from "@/components/knowledge-base/KnowledgeAiStudioCard";
import { KnowledgeEntriesTable } from "@/components/knowledge-base/KnowledgeEntriesTable";
import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
import { KnowledgeImportCard } from "@/components/knowledge-base/KnowledgeImportCard";
import { KnowledgeSearchBar } from "@/components/knowledge-base/KnowledgeSearchBar";
import { KnowledgeWebsiteSyncCard } from "@/components/knowledge-base/KnowledgeWebsiteSyncCard";
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
import { cn } from "@/lib/utils";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

type KnowledgeTool = "ai" | "import" | "website" | null;

type KnowledgeHubPanelProps = {
  entries: KnowledgeEntryData[];
  allEntries: KnowledgeEntryData[];
  hasActiveFilters: boolean;
  hasBusiness: boolean;
  geminiConfigured: boolean;
  websiteKnowledgeSync: WebsiteKnowledgeSyncData | null;
};

export function KnowledgeHubPanel({
  entries,
  allEntries,
  hasActiveFilters,
  hasBusiness,
  geminiConfigured,
  websiteKnowledgeSync,
}: KnowledgeHubPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<KnowledgeTool>(null);

  const totals = useMemo(() => {
    const website = allEntries.filter((entry) => entry.source === "website_sync").length;

    return {
      total: allEntries.length,
      website,
      manual: allEntries.length - website,
    };
  }, [allEntries]);

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
    <div className="flex w-full flex-col gap-4">
      <Card className="shadow-none">
        <CardHeader className="gap-4 space-y-0 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DatabaseIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl">Knowledge base</CardTitle>
                <CardDescription>
                  Keep the facts your AI Agent uses to answer customers.
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[24rem]">
            <Metric label="Entries" value={totals.total} />
            <Metric label="Website" value={totals.website} />
            <Metric label="Manual" value={totals.manual} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-3">
            <KnowledgeToolButton
              icon={<BotIcon className="size-4" />}
              title="Generate"
              description="Create structured facts from the business profile."
              meta={geminiConfigured ? "AI ready" : "AI not configured"}
              disabled={!geminiConfigured}
              onClick={() => setActiveTool("ai")}
            />
            <KnowledgeToolButton
              icon={<FileUpIcon className="size-4" />}
              title="Import"
              description="Paste text or upload a file and let AI categorize it."
              meta={geminiConfigured ? "TXT, MD, CSV" : "AI not configured"}
              disabled={!geminiConfigured}
              onClick={() => setActiveTool("import")}
            />
            <KnowledgeToolButton
              icon={<GlobeIcon className="size-4" />}
              title="Website sync"
              description="Connect a public site and keep customer-facing facts fresh."
              meta={websiteKnowledgeSync ? websiteKnowledgeSync.syncStatus : "Not set up"}
              onClick={() => setActiveTool("website")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="gap-4 space-y-0 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{KNOWLEDGE_MESSAGES.tableTitle}</CardTitle>
            <CardDescription>
              Search, edit, and remove the facts available to your AI Agent.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            Add entry
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <KnowledgeSearchBar />
          <KnowledgeEntriesTable
            entries={entries}
            hasActiveFilters={hasActiveFilters}
            onAddFirstEntry={() => setCreateOpen(true)}
            onMutated={handleRefresh}
          />
        </CardContent>
      </Card>

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

      <Dialog open={activeTool === "ai"} onOpenChange={(open) => setActiveTool(open ? "ai" : null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.aiStudioTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.aiStudioDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeAiStudioCard
            geminiConfigured={geminiConfigured}
            disabled={!hasBusiness}
            compact
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeTool === "import"}
        onOpenChange={(open) => setActiveTool(open ? "import" : null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.importTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.importDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeImportCard
            geminiConfigured={geminiConfigured}
            disabled={!hasBusiness}
            compact
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeTool === "website"}
        onOpenChange={(open) => setActiveTool(open ? "website" : null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{KNOWLEDGE_MESSAGES.websiteSyncCardTitle}</DialogTitle>
            <DialogDescription>
              {KNOWLEDGE_MESSAGES.websiteSyncCardDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeWebsiteSyncCard
            sync={websiteKnowledgeSync}
            hasBusiness={hasBusiness}
            geminiConfigured={geminiConfigured}
            compact
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function KnowledgeToolButton({
  icon,
  title,
  description,
  meta,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-28 items-start gap-3 rounded-lg border bg-background p-4 text-left transition",
        "hover:border-primary/40 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-55",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {meta}
          </span>
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
