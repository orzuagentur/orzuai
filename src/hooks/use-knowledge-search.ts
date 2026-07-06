"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { KnowledgeCategory } from "@/types/database.types";

function buildKnowledgeUrl(query: string, category: KnowledgeCategory | ""): string {
  const params = new URLSearchParams();

  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (category) {
    params.set("category", category);
  }

  const suffix = params.toString();

  return suffix
    ? `${DASHBOARD_ROUTES.aiAssistantKnowledge}?${suffix}`
    : DASHBOARD_ROUTES.aiAssistantKnowledge;
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
      router.push(DASHBOARD_ROUTES.aiAssistantKnowledge);
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
