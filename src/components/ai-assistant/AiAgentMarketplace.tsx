"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  AGENT_MARKETPLACE_CATEGORIES,
  getAgentTemplatesByCategory,
} from "@/features/ai-assistant/agent-marketplace-catalog";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentMarketplaceProps = {
  activeChannelFilter: MessagingChannel | null;
  searchQuery: string;
  onCancel: () => void;
};

export function AiAgentMarketplace({
  activeChannelFilter,
  searchQuery,
  onCancel,
}: AiAgentMarketplaceProps) {
  function hrefForTemplate(templateId: string) {
    return buildAiAssistantHref({
      channel: activeChannelFilter,
      tab: "agents",
      agent: "new",
      pick: templateId,
      q: searchQuery || null,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {AI_ASSISTANT_MESSAGES.marketplaceTitle}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.marketplaceDescription}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onCancel}>
          {AI_ASSISTANT_MESSAGES.marketplaceBackToAgents}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
        {AGENT_MARKETPLACE_CATEGORIES.map((category) => {
          const templates = getAgentTemplatesByCategory(category.id);

          if (templates.length === 0) {
            return null;
          }

          return (
            <section key={category.id} className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {category.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    href={hrefForTemplate(template.id)}
                    className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg",
                          template.categoryId === "voice"
                            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            : template.categoryId === "messaging_sms"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "bg-primary/10 text-primary",
                        )}
                      >
                        <template.icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium">{template.name}</p>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] font-normal"
                          >
                            {template.providerBadge}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                      {AI_ASSISTANT_MESSAGES.marketplaceConfigure}
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
