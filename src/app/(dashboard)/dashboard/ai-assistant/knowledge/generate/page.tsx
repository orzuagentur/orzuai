import { KnowledgeGeneratePage } from "@/components/knowledge-base/KnowledgeGeneratePage";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantKnowledgeGeneratePage() {
  const data = await getAiAssistantPageData();

  return (
    <KnowledgeGeneratePage
      geminiConfigured={data.geminiConfigured}
      hasBusiness={data.hasBusiness}
    />
  );
}
