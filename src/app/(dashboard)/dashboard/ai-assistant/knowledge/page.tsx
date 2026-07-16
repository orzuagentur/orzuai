import { KnowledgeHubPanel } from "@/components/knowledge-base/KnowledgeHubPanel";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantKnowledgePage() {
  const data = await getAiAssistantPageData();

  return (
    <KnowledgeHubPanel
      categories={data.knowledgeCategories}
      hasBusiness={data.hasBusiness}
      geminiConfigured={data.geminiConfigured}
      websiteKnowledgeSync={data.websiteKnowledgeSync}
    />
  );
}
