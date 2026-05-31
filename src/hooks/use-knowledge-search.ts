"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { KnowledgeCategory } from "@/types/database.types";

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
      const params = new URLSearchParams();

      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      if (category) {
        params.set("category", category);
      }

      const nextUrl = params.toString()
        ? `${DASHBOARD_ROUTES.knowledgeBase}?${params.toString()}`
        : DASHBOARD_ROUTES.knowledgeBase;

      startTransition(() => {
        router.push(nextUrl);
      });
    },
    [router],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(DASHBOARD_ROUTES.knowledgeBase);
    });
  }, [router]);

  return {
    currentQuery,
    currentCategory,
    applyFilters,
    clearFilters,
    isPending,
  };
}
