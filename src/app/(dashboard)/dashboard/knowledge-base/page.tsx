import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { KnowledgeBasePanel } from "@/components/knowledge-base/KnowledgeBasePanel";
import { WebsiteKnowledgeSection } from "@/components/knowledge-base/WebsiteKnowledgeSection";
import { Skeleton } from "@/components/ui/skeleton";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { hasGeminiEnv } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  listKnowledgeEntries,
  parseKnowledgeCategory,
} from "@/services/knowledge.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";

type KnowledgeBasePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function KnowledgeSearchFallback() {
  return <Skeleton className="h-8 w-full max-w-3xl" />;
}

export default function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <KnowledgeBasePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function KnowledgeBasePageContent({
  searchParams,
}: KnowledgeBasePageProps) {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = parseKnowledgeCategory(params.category);
  const hasActiveFilters = Boolean(query || category);

  const [entries, websiteKnowledgeSync] = business
    ? await Promise.all([
        listKnowledgeEntries(business.id, { query, category }),
        getWebsiteKnowledgeSync(business.id),
      ])
    : [[], null];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
      <WebsiteKnowledgeSection
        sync={websiteKnowledgeSync}
        hasBusiness={Boolean(business)}
        geminiConfigured={hasGeminiEnv()}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {KNOWLEDGE_MESSAGES.manualEntriesTitle}
        </h2>
        <Suspense fallback={<KnowledgeSearchFallback />}>
          <KnowledgeBasePanel
            entries={entries}
            hasActiveFilters={hasActiveFilters}
            hasBusiness={Boolean(business)}
          />
        </Suspense>
      </section>
    </div>
  );
}
