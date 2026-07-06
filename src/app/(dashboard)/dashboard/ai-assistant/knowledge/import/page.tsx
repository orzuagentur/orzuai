import { KnowledgeImportPage } from "@/components/knowledge-base/KnowledgeImportPage";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantKnowledgeImportPage() {
  const data = await getAiAssistantPageData();

  return (
    <KnowledgeImportPage
      geminiConfigured={data.geminiConfigured}
      hasBusiness={data.hasBusiness}
    />
  );
}
