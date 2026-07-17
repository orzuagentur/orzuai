"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { KnowledgeCategorySpreadsheet } from "@/components/knowledge-base/KnowledgeCategorySpreadsheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { KnowledgeLayoutKind } from "@/types/knowledge-category.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

const DEFAULT_TABLE_ID = "main";

type SheetDef = {
  id: string;
  title: string;
};

type KnowledgeCategoryTablesProps = {
  categoryName: string;
  layoutKind: KnowledgeLayoutKind;
  entries: KnowledgeEntryData[];
  linkedServiceEntries?: KnowledgeEntryData[];
};

function resolveTableId(entry: KnowledgeEntryData): string {
  return entry.metadata.tableId?.trim() || DEFAULT_TABLE_ID;
}

function resolveTableTitle(entry: KnowledgeEntryData): string {
  return entry.metadata.tableTitle?.trim() || "Main table";
}

function collectSheets(entries: KnowledgeEntryData[]): SheetDef[] {
  const map = new Map<string, string>();
  map.set(DEFAULT_TABLE_ID, "Main table");

  for (const entry of entries) {
    const id = resolveTableId(entry);
    if (!map.has(id)) {
      map.set(id, resolveTableTitle(entry));
    }
  }

  return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
}

export function KnowledgeCategoryTables({
  categoryName,
  layoutKind,
  entries,
  linkedServiceEntries = [],
}: KnowledgeCategoryTablesProps) {
  const derivedSheets = useMemo(() => collectSheets(entries), [entries]);
  const [extraSheets, setExtraSheets] = useState<SheetDef[]>([]);
  const [activeTableId, setActiveTableId] = useState(DEFAULT_TABLE_ID);
  const [pendingTitle, setPendingTitle] = useState("");
  const [isNaming, setIsNaming] = useState(false);

  const sheets = useMemo(() => {
    const merged = new Map<string, string>();
    for (const sheet of derivedSheets) {
      merged.set(sheet.id, sheet.title);
    }
    for (const sheet of extraSheets) {
      if (!merged.has(sheet.id)) {
        merged.set(sheet.id, sheet.title);
      }
    }
    return Array.from(merged.entries()).map(([id, title]) => ({ id, title }));
  }, [derivedSheets, extraSheets]);

  const activeSheet =
    sheets.find((sheet) => sheet.id === activeTableId) ?? sheets[0]!;

  const tableEntries = useMemo(
    () =>
      entries.filter((entry) => resolveTableId(entry) === activeSheet.id),
    [activeSheet.id, entries],
  );

  const showLinkedServices =
    layoutKind === "pricing" &&
    activeSheet.id === DEFAULT_TABLE_ID &&
    linkedServiceEntries.length > 0;

  function startAddTable() {
    setPendingTitle(`Table ${sheets.length + 1}`);
    setIsNaming(true);
  }

  function confirmAddTable() {
    const title = pendingTitle.trim();
    if (title.length < 2) {
      toast.error("Table name must be at least 2 characters.");
      return;
    }

    const id = `table-${Date.now()}`;
    setExtraSheets((current) => [...current, { id, title }]);
    setActiveTableId(id);
    setIsNaming(false);
    setPendingTitle("");
    toast.success("New table added. Add rows and save.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            type="button"
            onClick={() => setActiveTableId(sheet.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              activeSheet.id === sheet.id
                ? "border-violet-200 bg-violet-50 font-medium text-violet-900"
                : "bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {sheet.title}
          </button>
        ))}
        {isNaming ? (
          <div className="flex items-center gap-2">
            <Input
              value={pendingTitle}
              onChange={(event) => setPendingTitle(event.target.value)}
              className="h-9 w-44"
              placeholder="Table name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmAddTable();
                }
                if (event.key === "Escape") {
                  setIsNaming(false);
                }
              }}
            />
            <Button type="button" size="sm" onClick={confirmAddTable}>
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsNaming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startAddTable}>
            <PlusIcon className="size-4" />
            Add table
          </Button>
        )}
      </div>

      <KnowledgeCategorySpreadsheet
        key={activeSheet.id}
        categoryName={categoryName}
        layoutKind={layoutKind}
        entries={tableEntries}
        linkedServiceEntries={showLinkedServices ? linkedServiceEntries : []}
        tableId={activeSheet.id}
        tableTitle={activeSheet.title}
        allowAddRows={!showLinkedServices}
      />
    </div>
  );
}
