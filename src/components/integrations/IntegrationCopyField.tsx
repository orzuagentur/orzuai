"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { IntegrationHelpTip } from "@/components/integrations/IntegrationHelpTip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type IntegrationCopyFieldProps = {
  label: string;
  value: string;
  hint?: string;
  helpTitle?: string;
  helpContent?: React.ReactNode;
  multiline?: boolean;
  copySuccessMessage?: string;
  className?: string;
};

export function IntegrationCopyField({
  label,
  value,
  hint,
  helpTitle,
  helpContent,
  multiline = false,
  copySuccessMessage = "Copied to clipboard",
  className,
}: IntegrationCopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(copySuccessMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {helpTitle && helpContent ? (
          <IntegrationHelpTip title={helpTitle}>{helpContent}</IntegrationHelpTip>
        ) : null}
      </div>
      <div className="flex gap-2">
        {multiline ? (
          <textarea
            readOnly
            value={value}
            rows={Math.min(8, value.split("\n").length + 1)}
            className="min-h-[5.5rem] w-full flex-1 resize-y rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed"
          />
        ) : (
          <input
            readOnly
            value={value}
            className="h-11 w-full flex-1 rounded-md border border-input bg-muted/30 px-3 font-mono text-sm"
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <CheckIcon className="size-4 text-zinc-700" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
      </div>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
