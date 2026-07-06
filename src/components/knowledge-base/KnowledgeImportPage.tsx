"use client";

import Link from "next/link";

import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { KnowledgeImportCard } from "@/components/knowledge-base/KnowledgeImportCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";

type KnowledgeImportPageProps = {
  geminiConfigured: boolean;
  hasBusiness: boolean;
};

export function KnowledgeImportPage({
  geminiConfigured,
  hasBusiness,
}: KnowledgeImportPageProps) {
  if (!hasBusiness) {
    return (
      <div className="p-8">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{KNOWLEDGE_MESSAGES.noBusinessTitle}</CardTitle>
            <CardDescription>
              {KNOWLEDGE_MESSAGES.noBusinessDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AiAssistantPageHeader
        title={KNOWLEDGE_MESSAGES.importTitle}
        description={KNOWLEDGE_MESSAGES.importDescription}
        backHref={DASHBOARD_ROUTES.aiAssistantKnowledge}
        backLabel="Knowledge base"
      />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
        <KnowledgeImportCard
          geminiConfigured={geminiConfigured}
          disabled={!hasBusiness}
        />
      </div>
    </div>
  );
}
