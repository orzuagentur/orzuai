import { Suspense } from "react";

import { KnowledgeBasePanel } from "@/components/knowledge-base/KnowledgeBasePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  listKnowledgeEntries,
  parseKnowledgeCategory,
} from "@/services/knowledge.service";

type KnowledgeBasePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function KnowledgeSearchFallback() {
  return <Skeleton className="h-8 w-full max-w-3xl" />;
}

export default async function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = parseKnowledgeCategory(params.category);
  const hasActiveFilters = Boolean(query || category);

  const entries = business
    ? await listKnowledgeEntries(business.id, { query, category })
    : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {KNOWLEDGE_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {KNOWLEDGE_MESSAGES.pageDescription}
        </p>
      </div>

      <Suspense fallback={<KnowledgeSearchFallback />}>
        <KnowledgeBasePanel
          entries={entries}
          hasActiveFilters={hasActiveFilters}
          hasBusiness={Boolean(business)}
        />
      </Suspense>
    </div>
  );
}
