import { WebsiteKnowledgeActivatePanel } from "@/components/website-knowledge/WebsiteKnowledgeActivatePanel";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

type WebsiteKnowledgeSectionProps = {
  sync: WebsiteKnowledgeSyncData | null;
  hasBusiness: boolean;
  geminiConfigured: boolean;
};

export function WebsiteKnowledgeSection({
  sync,
  hasBusiness,
  geminiConfigured,
}: WebsiteKnowledgeSectionProps) {
  return (
    <section id="website-sync" className="scroll-mt-6 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {KNOWLEDGE_MESSAGES.websiteSyncTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {KNOWLEDGE_MESSAGES.websiteSyncDescription}
        </p>
      </div>
      <WebsiteKnowledgeActivatePanel
        sync={sync}
        hasBusiness={hasBusiness}
        geminiConfigured={geminiConfigured}
        showKnowledgeBaseLink={false}
      />
    </section>
  );
}
