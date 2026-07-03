"use client";

import { GlobeIcon } from "lucide-react";

import { WebsiteKnowledgeActivatePanel } from "@/components/website-knowledge/WebsiteKnowledgeActivatePanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

type KnowledgeWebsiteSyncCardProps = {
  sync: WebsiteKnowledgeSyncData | null;
  hasBusiness: boolean;
  geminiConfigured: boolean;
  compact?: boolean;
};

export function KnowledgeWebsiteSyncCard({
  sync,
  hasBusiness,
  geminiConfigured,
  compact = false,
}: KnowledgeWebsiteSyncCardProps) {
  if (compact) {
    return (
      <WebsiteKnowledgeActivatePanel
        sync={sync}
        hasBusiness={hasBusiness}
        geminiConfigured={geminiConfigured}
        embeddedInHub
        showKnowledgeBaseLink={false}
      />
    );
  }

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
          <GlobeIcon className="size-5" />
        </div>
        <CardTitle className="text-base">
          {KNOWLEDGE_MESSAGES.websiteSyncCardTitle}
        </CardTitle>
        <CardDescription>
          {KNOWLEDGE_MESSAGES.websiteSyncCardDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <WebsiteKnowledgeActivatePanel
          sync={sync}
          hasBusiness={hasBusiness}
          geminiConfigured={geminiConfigured}
          embeddedInHub
          showKnowledgeBaseLink={false}
        />
      </CardContent>
    </Card>
  );
}
