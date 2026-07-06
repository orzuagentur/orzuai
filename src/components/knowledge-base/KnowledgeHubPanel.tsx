"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BotIcon,
  FileUpIcon,
  GlobeIcon,
  PlusIcon,
} from "lucide-react";

import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { KnowledgeEntriesTable } from "@/components/knowledge-base/KnowledgeEntriesTable";
import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
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
import { cn } from "@/lib/utils";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

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
    <div className="flex min-h-0 flex-1 flex-col">
      <AiAssistantPageHeader
        title="Knowledge base"
        description="Keep the facts your AI Agent uses to answer customers."
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel="Dashboard"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <Metric label="Entries" value={totals.total} />
          <Metric label="Website" value={totals.website} />
          <Metric label="Manual" value={totals.manual} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KnowledgeToolLink
            href={DASHBOARD_ROUTES.aiAssistantKnowledgeGenerate}
            icon={<BotIcon className="size-4" />}
            title="Generate"
            description="Create structured facts from your business profile."
            meta={geminiConfigured ? "AI ready" : "AI not configured"}
            disabled={!geminiConfigured}
          />
          <KnowledgeToolLink
            href={DASHBOARD_ROUTES.aiAssistantKnowledgeImport}
            icon={<FileUpIcon className="size-4" />}
            title="Import"
            description="Upload PDF, Word, Excel, or text files."
            meta="PDF, DOCX, XLSX, TXT"
            disabled={!geminiConfigured}
          />
          <KnowledgeToolLink
            href={DASHBOARD_ROUTES.aiAssistantKnowledgeWebsite}
            icon={<GlobeIcon className="size-4" />}
            title="Website scanner"
            description="Crawl your public site and sync customer-facing facts."
            meta={websiteKnowledgeSync ? websiteKnowledgeSync.syncStatus : "Not set up"}
          />
        </div>

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
      </div>

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

function KnowledgeToolLink({
  href,
  icon,
  title,
  description,
  meta,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className={cn(
          "flex min-h-28 items-start gap-3 rounded-lg border bg-background p-4 opacity-55",
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
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-28 items-start gap-3 rounded-lg border bg-background p-4 transition",
        "hover:border-primary/40 hover:bg-muted/30",
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
    </Link>
  );
}
