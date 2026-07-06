import { WebsiteKnowledgeScanPage } from "@/components/website-knowledge/WebsiteKnowledgeScanPage";
import { getAiAssistantPageData } from "@/services/ai-assistant.service";

export default async function AiAssistantKnowledgeWebsitePage() {
  const data = await getAiAssistantPageData();

  return (
    <WebsiteKnowledgeScanPage
      sync={data.websiteKnowledgeSync}
      hasBusiness={data.hasBusiness}
      geminiConfigured={data.geminiConfigured}
    />
  );
}
