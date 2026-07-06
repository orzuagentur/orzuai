import { KnowledgeHubPanel } from "@/components/knowledge-base/KnowledgeHubPanel";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

type KnowledgePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default async function AiAssistantKnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const params = await searchParams;
  const data = await getAiAssistantPageData(params);

  return (
    <KnowledgeHubPanel
      entries={data.knowledgeEntries}
      allEntries={data.knowledgeAllEntries}
      hasActiveFilters={data.knowledgeHasActiveFilters}
      hasBusiness={data.hasBusiness}
      geminiConfigured={data.geminiConfigured}
      websiteKnowledgeSync={data.websiteKnowledgeSync}
    />
  );
}
