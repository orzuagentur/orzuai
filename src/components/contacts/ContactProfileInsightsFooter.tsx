"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateContactInsightsAction } from "@/features/contacts/actions/generate-contact-insights";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";

type ContactProfileInsightsFooterProps = {
  contactId: string;
  aiSummary: string | null;
  onRefresh: () => Promise<void>;
  readOnly?: boolean;
  className?: string;
};

export function ContactProfileInsightsFooter({
  contactId,
  aiSummary,
  onRefresh,
  readOnly = false,
  className,
}: ContactProfileInsightsFooterProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateInsights() {
    setIsGenerating(true);

    try {
      const result = await generateContactInsightsAction({ contactId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.insightsGenerated);
      await onRefresh();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div
      className={cn(
        "shrink-0 border-t bg-muted/10 px-5 py-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
          {CONTACTS_MESSAGES.aiSummaryLabel}
        </p>
        {readOnly ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isGenerating}
            onClick={() => {
              void handleGenerateInsights();
            }}
          >
            {isGenerating ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="size-3.5" />
            )}
            {isGenerating
              ? CONTACTS_MESSAGES.generatingInsights
              : CONTACTS_MESSAGES.generateInsights}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {aiSummary ??
          "No AI summary yet. Generate insights from recent messages."}
      </p>
    </div>
  );
}
