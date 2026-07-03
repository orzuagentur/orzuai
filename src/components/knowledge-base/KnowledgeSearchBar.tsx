"use client";

import { useState } from "react";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKnowledgeSearch } from "@/hooks/use-knowledge-search";
import type { KnowledgeCategory } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_CATEGORY_META } from "@/features/knowledge-base/categories";
import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";

type KnowledgeSearchBarProps = {
  className?: string;
};

export function KnowledgeSearchBar({ className }: KnowledgeSearchBarProps) {
  const {
    currentQuery,
    currentCategory,
    applyFilters,
    clearFilters,
    isPending,
  } = useKnowledgeSearch();
  const [query, setQuery] = useState(currentQuery);
  const [category, setCategory] = useState<KnowledgeCategory | "">(
    currentCategory,
  );

  const hasActiveFilters = Boolean(currentQuery || currentCategory);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters(query, category);
      }}
      className={cn("grid gap-3 md:grid-cols-[1fr_180px_auto_auto]", className)}
    >
      <div className="space-y-2">
        <Label htmlFor="knowledge-search" className="sr-only">
          Search knowledge
        </Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="knowledge-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or content..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="knowledge-filter-category" className="sr-only">
          Category
        </Label>
        <select
          id="knowledge-filter-category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as KnowledgeCategory | "")
          }
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All categories</option>
          {KNOWLEDGE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {KNOWLEDGE_CATEGORY_META[item].label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          "Search"
        )}
      </Button>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setQuery("");
            setCategory("");
            clearFilters();
          }}
        >
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : (
        <div className="hidden md:block" />
      )}
    </form>
  );
}
