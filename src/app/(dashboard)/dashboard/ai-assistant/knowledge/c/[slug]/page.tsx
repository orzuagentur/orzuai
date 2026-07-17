import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { KnowledgeCategoryTables } from "@/components/knowledge-base/KnowledgeCategoryTables";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getKnowledgeCategoryBySlug,
} from "@/services/knowledge-categories.service";
import { listKnowledgeEntries } from "@/services/knowledge.service";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function KnowledgeCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    redirect(DASHBOARD_ROUTES.settings);
  }

  const category = await getKnowledgeCategoryBySlug(business.id, slug);
  if (!category) {
    notFound();
  }

  const [entries, serviceEntries] = await Promise.all([
    listKnowledgeEntries(business.id, { category: category.name }),
    category.layoutKind === "pricing"
      ? listKnowledgeEntries(business.id, { category: "Services" })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.aiAssistantKnowledge}>
                <ArrowLeftIcon className="size-4" />
                Knowledge base
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {category.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Rows</p>
            <p className="text-xl font-semibold tabular-nums">
              {category.layoutKind === "pricing" && serviceEntries.length > 0
                ? serviceEntries.length
                : entries.length}
            </p>
          </div>
        </div>

        <KnowledgeCategoryTables
          categoryName={category.name}
          layoutKind={category.layoutKind}
          entries={entries}
          linkedServiceEntries={serviceEntries}
        />
      </div>
    </div>
  );
}
