"use client";

import { CircleHelpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type IntegrationHelpTipProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function IntegrationHelpTip({
  title,
  description,
  children,
}: IntegrationHelpTipProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={`Help: ${title}`}
        >
          <CircleHelpIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
