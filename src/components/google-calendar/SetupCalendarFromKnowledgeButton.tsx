"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setupCalendarFromKnowledgeAction } from "@/features/platform-copilot/actions/setup-calendar-from-knowledge";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";

type SetupCalendarFromKnowledgeButtonProps = {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function SetupCalendarFromKnowledgeButton({
  variant = "outline",
  size = "sm",
  className,
}: SetupCalendarFromKnowledgeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isRunning, setIsRunning] = useState(false);
  const { setIsOpen } = usePlatformCopilot();

  function handleClick() {
    setIsRunning(true);
    startTransition(async () => {
      try {
        const result = await setupCalendarFromKnowledgeAction();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(
          `Создано ${result.resourceCount} ресурсов для «${result.businessTypeLabel}»`,
        );
        window.location.reload();
      } finally {
        setIsRunning(false);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isPending || isRunning}
        onClick={handleClick}
      >
        {isPending || isRunning ? (
          <Loader2Icon className="mr-2 size-4 animate-spin" />
        ) : (
          <SparklesIcon className="mr-2 size-4" />
        )}
        Создать из базы знаний
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className="text-muted-foreground"
        onClick={() => setIsOpen(true)}
      >
        orzuAI
      </Button>
    </div>
  );
}
