"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FileUpIcon,
  GlobeIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  createKnowledgeCategoryAction,
  deleteKnowledgeCategoryAction,
} from "@/features/knowledge-base/actions/manage-knowledge-category";
import { cn } from "@/lib/utils";
import type { KnowledgeCategoryCard } from "@/types/knowledge-category.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

const LAYOUT_TONES: Record<string, string> = {
  services: "bg-sky-500/10 text-sky-700",
  pricing: "bg-emerald-500/10 text-emerald-700",
  faq: "bg-indigo-500/10 text-indigo-700",
  hours: "bg-orange-500/10 text-orange-700",
  contact: "bg-violet-500/10 text-violet-700",
  address: "bg-amber-500/10 text-amber-700",
  policies: "bg-rose-500/10 text-rose-700",
  generic: "bg-slate-500/10 text-slate-700",
};

type KnowledgeHubPanelProps = {
  categories: KnowledgeCategoryCard[];
  hasBusiness: boolean;
  geminiConfigured: boolean;
  websiteKnowledgeSync: WebsiteKnowledgeSyncData | null;
};

export function KnowledgeHubPanel({
  categories,
  hasBusiness,
  geminiConfigured,
  websiteKnowledgeSync,
}: KnowledgeHubPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      categories: categories.length,
      entries: categories.reduce((sum, item) => sum + item.entryCount, 0),
    }),
    [categories],
  );

  const syncLabel =
    websiteKnowledgeSync?.syncStatus === "syncing"
      ? "Scanning…"
      : websiteKnowledgeSync?.syncStatus === "ready"
        ? "Ready"
        : websiteKnowledgeSync?.siteUrl
          ? "Configured"
          : "Connect site";

  async function handleCreate() {
    setIsSaving(true);
    try {
      const result = await createKnowledgeCategoryAction({
        name,
        description: description || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Category card created.");
      setCreateOpen(false);
      setName("");
      setDescription("");
      router.refresh();
      router.push(
        DASHBOARD_ROUTES.aiAssistantKnowledgeCategory(result.category.slug),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: KnowledgeCategoryCard) {
    if (category.isSystem) {
      toast.error("System categories cannot be deleted.");
      return;
    }
    if (
      !window.confirm(
        `Delete “${category.name}” and all its rows? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(category.id);
    try {
      const result = await deleteKnowledgeCategoryAction(category.id);
      if (!result.success) {
        toast.error(result.message ?? "Unable to delete category.");
        return;
      }
      toast.success("Category deleted.");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (!hasBusiness) {
    return (
      <Card className="mx-auto max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>Business required</CardTitle>
          <CardDescription>
            Create a business profile before managing the knowledge base.
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
        description="One card per topic. Open a card to edit the spreadsheet the AI uses for answers."
        backHref={DASHBOARD_ROUTES.aiAssistant}
        backLabel="Dashboard"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <Metric label="Categories" value={totals.categories} />
            <Metric label="Rows" value={totals.entries} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={DASHBOARD_ROUTES.aiAssistantKnowledgeImport}>
                <FileUpIcon className="size-4" />
                Import
              </Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={DASHBOARD_ROUTES.aiAssistantKnowledgeWebsite}>
                <GlobeIcon className="size-4" />
                Scan website
              </Link>
            </Button>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              New category
            </Button>
          </div>
        </div>

        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-medium">Website scan</p>
              <p className="text-xs text-muted-foreground">
                Scans every page in the background, then AI fills category cards —
                and creates new cards when the site has extra topics.
                {!geminiConfigured ? " Configure Gemini to enable scanning." : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                {syncLabel}
              </span>
              <Button type="button" size="sm" asChild disabled={!geminiConfigured}>
                <Link href={DASHBOARD_ROUTES.aiAssistantKnowledgeWebsite}>
                  Open scanner
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group relative rounded-xl border bg-card transition-colors hover:bg-muted/30"
            >
              <Link
                href={DASHBOARD_ROUTES.aiAssistantKnowledgeCategory(category.slug)}
                className="block p-4 pr-12"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      LAYOUT_TONES[category.layoutKind] ?? LAYOUT_TONES.generic,
                    )}
                  >
                    {category.name}
                  </span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {category.entryCount}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-3 text-xs font-medium text-primary">
                  Open spreadsheet →
                </p>
              </Link>
              {!category.isSystem ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label={`Delete ${category.name}`}
                  disabled={deletingId === category.id}
                  onClick={() => void handleDelete(category)}
                >
                  {deletingId === category.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New category card</DialogTitle>
            <DialogDescription>
              Create a topic card. You can fill its spreadsheet after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="kb-cat-name">Name</Label>
              <Input
                id="kb-cat-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Shipping, Warranty, Team"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-cat-desc">Description</Label>
              <Textarea
                id="kb-cat-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What belongs in this card?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving || name.trim().length < 2}
              onClick={() => void handleCreate()}
            >
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
