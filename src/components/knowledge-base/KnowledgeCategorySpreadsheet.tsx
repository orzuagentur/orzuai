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
  dirty?: boolean;
};

type KnowledgeCategorySpreadsheetProps = {
  categoryName: string;
  layoutKind: KnowledgeLayoutKind;
  entries: KnowledgeEntryData[];
  /** For Pricing layout: show Services rows so prices are editable in context. */
  linkedServiceEntries?: KnowledgeEntryData[];
  tableId?: string;
  tableTitle?: string;
  /** When false, hide add/delete (e.g. Pricing linked to Services). */
  allowAddRows?: boolean;
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
  priceOnly: boolean;
} {
  switch (layoutKind) {
    case "pricing":
      return {
        name: "Service / product",
        details: "Description",
        showPrice: true,
        priceOnly: true,
      };
    case "services":
      return {
        name: "Service / product",
        details: "Description",
        showPrice: true,
        priceOnly: false,
      };
    case "faq":
      return { name: "Question", details: "Answer", showPrice: false, priceOnly: false };
    case "hours":
      return { name: "Day / period", details: "Hours", showPrice: false, priceOnly: false };
    case "contact":
      return { name: "Channel", details: "Details", showPrice: false, priceOnly: false };
    case "address":
      return {
        name: "Location",
        details: "Address / area",
        showPrice: false,
        priceOnly: false,
      };
    case "policies":
      return { name: "Policy", details: "Details", showPrice: false, priceOnly: false };
    default:
      return { name: "Title", details: "Information", showPrice: false, priceOnly: false };
  }
}

export function KnowledgeCategorySpreadsheet({
  categoryName,
  layoutKind,
  entries,
  linkedServiceEntries = [],
  tableId = "main",
  tableTitle = "Main table",
  allowAddRows,
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
  const canAddRows =
    allowAddRows ?? !(labels.priceOnly && linkedServiceEntries.length > 0);
  const priceOnlyMode = labels.priceOnly && linkedServiceEntries.length > 0;

  const [rows, setRows] = useState<SheetRow[]>(() => toRows(sourceEntries));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const dirtyCount = useMemo(
    () => rows.filter((row) => row.dirty || row.isNew).length,
    [rows],
  );

  const emptyHint = useMemo(() => {
    if (priceOnlyMode) {
      return "No services yet. Open Services, add items with prices, and they appear here.";
    }
    return "No rows yet. Add the first one to start the spreadsheet.";
  }, [priceOnlyMode]);

  function updateLocal(id: string, patch: Partial<SheetRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, ...patch, dirty: true } : row,
      ),
    );
  }

  function buildMetadata(row: SheetRow): Record<string, string | undefined> {
    return {
      ...(labels.showPrice ? { price: row.price.trim() || undefined } : {}),
      tableId,
      tableTitle,
    };
  }

  async function persistRow(row: SheetRow): Promise<boolean> {
    if (priceOnlyMode) {
      if (!row.id || row.isNew) {
        return false;
      }
    } else if (row.name.trim().length < 2 || row.details.trim().length < 1) {
      toast.error("Name and details are required.");
      return false;
    }

    if (row.isNew) {
      const result = await createKnowledgeEntryAction({
        title: row.name.trim(),
        content: row.details.trim(),
        category: saveCategory,
        metadata: buildMetadata(row),
      });
      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                id: result.data.id,
                name: result.data.title,
                details: result.data.content,
                price: result.data.metadata.price ?? "",
                dirty: false,
              }
            : item,
        ),
      );
      return true;
    }

    const result = await updateKnowledgeEntryAction(row.id, {
      title: row.name.trim(),
      content: row.details.trim(),
      category: saveCategory,
      metadata: buildMetadata(row),
    });
    if (!result.success) {
      toast.error(result.error.message);
      return false;
    }
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, dirty: false } : item,
      ),
    );
    return true;
  }

  async function saveRow(row: SheetRow) {
    setSavingId(row.id);
    try {
      const ok = await persistRow(row);
      if (ok) {
        toast.success("Saved.");
        router.refresh();
      }
    } finally {
      setSavingId(null);
    }
  }

  async function saveAll() {
    const targets = rows.filter((row) => row.dirty || row.isNew);
    if (targets.length === 0) {
      toast.message("Nothing to save.");
      return;
    }

    setIsSavingAll(true);
    try {
      let saved = 0;
      for (const row of targets) {
        const ok = await persistRow(row);
        if (ok) saved += 1;
      }
      if (saved > 0) {
        toast.success(
          saved === 1 ? "1 row saved." : `${saved} rows saved.`,
        );
        router.refresh();
      }
    } finally {
      setIsSavingAll(false);
    }
  }

  async function removeRow(row: SheetRow) {
    if (!canAddRows) {
      toast.error("Delete services from the Services card.");
      return;
    }
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
    if (!canAddRows) {
      toast.message("Add new items in the Services card, with a price.");
      return;
    }
    setIsAdding(true);
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        details: "",
        price: "",
        isNew: true,
        dirty: true,
      },
    ]);
    setIsAdding(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {priceOnlyMode
            ? "Edit prices only for this card. Service names stay linked from Services."
            : (
              <>
                Excel-style table for{" "}
                <span className="font-medium text-foreground">{tableTitle}</span>
                {" "}
                (
                <span className="font-medium text-foreground">{categoryName}</span>
                )
              </>
            )}
          <span className="ml-2 tabular-nums text-foreground">
            · {rows.length} item{rows.length === 1 ? "" : "s"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void saveAll()}
            disabled={isSavingAll || dirtyCount === 0}
          >
            {isSavingAll ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Save
            {dirtyCount > 0 ? ` (${dirtyCount})` : ""}
          </Button>
          {canAddRows ? (
            <Button type="button" size="sm" onClick={addRow} disabled={isAdding}>
              <PlusIcon className="size-4" />
              Add row
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="min-w-[180px] px-3 py-2 font-medium">{labels.name}</th>
              {!priceOnlyMode ? (
                <th className="min-w-[280px] px-3 py-2 font-medium">
                  {labels.details}
                </th>
              ) : null}
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
                  colSpan={priceOnlyMode ? 3 : labels.showPrice ? 4 : 3}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  {emptyHint}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const busy = savingId === row.id || isSavingAll;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b align-top",
                      index % 2 === 1 && "bg-muted/10",
                    )}
                  >
                    <td className="p-0">
                      {priceOnlyMode ? (
                        <p className="px-3 py-2 font-medium">{row.name}</p>
                      ) : (
                        <input
                          className="h-full w-full bg-transparent px-3 py-2 outline-none focus:bg-primary/5"
                          value={row.name}
                          disabled={busy}
                          placeholder={labels.name}
                          onChange={(event) =>
                            updateLocal(row.id, { name: event.target.value })
                          }
                        />
                      )}
                    </td>
                    {!priceOnlyMode ? (
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
                    ) : null}
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
                          disabled={busy || (!row.dirty && !row.isNew)}
                          onClick={() => void saveRow(row)}
                        >
                          {busy && savingId === row.id ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        {canAddRows ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void removeRow(row)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        ) : null}
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
