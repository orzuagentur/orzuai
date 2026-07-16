"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createKnowledgeEntryAction } from "@/features/knowledge-base/actions/create-knowledge-entry";
import { deleteKnowledgeEntryAction } from "@/features/knowledge-base/actions/delete-knowledge-entry";
import { updateKnowledgeEntryAction } from "@/features/knowledge-base/actions/update-knowledge-entry";
import type { KnowledgeLayoutKind } from "@/types/knowledge-category.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import { cn } from "@/lib/utils";

type SheetRow = {
  id: string;
  name: string;
  details: string;
  price: string;
  isNew?: boolean;
};

type KnowledgeCategorySpreadsheetProps = {
  categoryName: string;
  layoutKind: KnowledgeLayoutKind;
  entries: KnowledgeEntryData[];
  /** For Pricing layout: show Services rows so prices are editable in context. */
  linkedServiceEntries?: KnowledgeEntryData[];
};

function toRows(entries: KnowledgeEntryData[]): SheetRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.title,
    details: entry.content,
    price: entry.metadata.price ?? "",
  }));
}

function columnLabels(layoutKind: KnowledgeLayoutKind): {
  name: string;
  details: string;
  showPrice: boolean;
} {
  switch (layoutKind) {
    case "services":
    case "pricing":
      return { name: "Service / product", details: "Description", showPrice: true };
    case "faq":
      return { name: "Question", details: "Answer", showPrice: false };
    case "hours":
      return { name: "Day / period", details: "Hours", showPrice: false };
    case "contact":
      return { name: "Channel", details: "Details", showPrice: false };
    case "address":
      return { name: "Location", details: "Address / area", showPrice: false };
    case "policies":
      return { name: "Policy", details: "Details", showPrice: false };
    default:
      return { name: "Title", details: "Information", showPrice: false };
  }
}

export function KnowledgeCategorySpreadsheet({
  categoryName,
  layoutKind,
  entries,
  linkedServiceEntries = [],
}: KnowledgeCategorySpreadsheetProps) {
  const router = useRouter();
  const labels = columnLabels(layoutKind);
  const sourceEntries =
    layoutKind === "pricing" && linkedServiceEntries.length > 0
      ? linkedServiceEntries
      : entries;
  const saveCategory =
    layoutKind === "pricing" && linkedServiceEntries.length > 0
      ? "Services"
      : categoryName;

  const [rows, setRows] = useState<SheetRow[]>(() => toRows(sourceEntries));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const emptyHint = useMemo(() => {
    if (layoutKind === "pricing") {
      return "No services yet. Add rows here or open Services and fill the list first.";
    }
    return "No rows yet. Add the first one to start the spreadsheet.";
  }, [layoutKind]);

  function updateLocal(id: string, patch: Partial<SheetRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function saveRow(row: SheetRow) {
    if (row.name.trim().length < 2 || row.details.trim().length < 1) {
      toast.error("Name and details are required.");
      return;
    }

    setSavingId(row.id);
    try {
      if (row.isNew) {
        const result = await createKnowledgeEntryAction({
          title: row.name.trim(),
          content: row.details.trim(),
          category: saveCategory,
          metadata: labels.showPrice && row.price.trim()
            ? { price: row.price.trim() }
            : {},
        });
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
        toast.success("Row added.");
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  id: result.data.id,
                  name: result.data.title,
                  details: result.data.content,
                  price: result.data.metadata.price ?? "",
                }
              : item,
          ),
        );
        router.refresh();
        return;
      }

      const result = await updateKnowledgeEntryAction(row.id, {
        title: row.name.trim(),
        content: row.details.trim(),
        category: saveCategory,
        metadata: labels.showPrice
          ? { price: row.price.trim() || undefined }
          : {},
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Row saved.");
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(row: SheetRow) {
    if (row.isNew) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }
    if (!window.confirm("Delete this row?")) {
      return;
    }
    setSavingId(row.id);
    try {
      const result = await deleteKnowledgeEntryAction(row.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      toast.success("Row deleted.");
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  function addRow() {
    setIsAdding(true);
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        details: "",
        price: "",
        isNew: true,
      },
    ]);
    setIsAdding(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Excel-style table for <span className="font-medium text-foreground">{categoryName}</span>
          {layoutKind === "pricing" && linkedServiceEntries.length > 0
            ? " · showing Services with prices"
            : null}
        </p>
        <Button type="button" size="sm" onClick={addRow} disabled={isAdding}>
          <PlusIcon className="size-4" />
          Add row
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="min-w-[180px] px-3 py-2 font-medium">{labels.name}</th>
              <th className="min-w-[280px] px-3 py-2 font-medium">{labels.details}</th>
              {labels.showPrice ? (
                <th className="min-w-[120px] px-3 py-2 font-medium">Price</th>
              ) : null}
              <th className="w-[140px] px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={labels.showPrice ? 4 : 3}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  {emptyHint}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const busy = savingId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b align-top",
                      index % 2 === 1 && "bg-muted/10",
                    )}
                  >
                    <td className="p-0">
                      <input
                        className="h-full w-full bg-transparent px-3 py-2 outline-none focus:bg-primary/5"
                        value={row.name}
                        disabled={busy}
                        placeholder={labels.name}
                        onChange={(event) =>
                          updateLocal(row.id, { name: event.target.value })
                        }
                      />
                    </td>
                    <td className="p-0">
                      <textarea
                        className="min-h-[64px] w-full resize-y bg-transparent px-3 py-2 outline-none focus:bg-primary/5"
                        value={row.details}
                        disabled={busy}
                        placeholder={labels.details}
                        onChange={(event) =>
                          updateLocal(row.id, { details: event.target.value })
                        }
                      />
                    </td>
                    {labels.showPrice ? (
                      <td className="p-0">
                        <input
                          className="h-full w-full bg-transparent px-3 py-2 outline-none focus:bg-primary/5"
                          value={row.price}
                          disabled={busy}
                          placeholder="e.g. €49"
                          onChange={(event) =>
                            updateLocal(row.id, { price: event.target.value })
                          }
                        />
                      </td>
                    ) : null}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void saveRow(row)}
                        >
                          {busy ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void removeRow(row)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
