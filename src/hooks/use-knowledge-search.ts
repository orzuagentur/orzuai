"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { KnowledgeCategory } from "@/types/database.types";

function buildKnowledgeUrl(query: string, category: KnowledgeCategory | ""): string {
  const params = new URLSearchParams();
  params.set("tab", "knowledge");

  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (category) {
    params.set("category", category);
  }

  return `${DASHBOARD_ROUTES.aiAssistant}?${params.toString()}`;
}

export function useKnowledgeSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const currentCategory = (searchParams.get("category") ?? "") as
    | KnowledgeCategory
    | "";

  const applyFilters = useCallback(
    (query: string, category: KnowledgeCategory | "") => {
      startTransition(() => {
        router.push(buildKnowledgeUrl(query, category));
      });
    },
    [router],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(`${DASHBOARD_ROUTES.aiAssistant}?tab=knowledge`);
    });
  }, [router]);

  const applyCategoryFilter = useCallback(
    (category: KnowledgeCategory | "") => {
      applyFilters(currentQuery, category);
    },
    [applyFilters, currentQuery],
  );

  return {
    currentQuery,
    currentCategory,
    applyFilters,
    applyCategoryFilter,
    clearFilters,
    isPending,
  };
}
