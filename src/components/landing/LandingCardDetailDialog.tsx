"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LandingCardDetail = {
  title: string;
  description: string;
  detail?: string;
  metric?: string;
};

type LandingCardDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: LandingCardDetail | null;
  hideLabel: string;
};

export function LandingCardDetailDialog({
  open,
  onOpenChange,
  card,
  hideLabel,
}: LandingCardDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-[var(--landing-line)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl font-semibold text-[var(--landing-ink)]">
            {card?.title}
          </DialogTitle>
        </DialogHeader>
        {card?.metric ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--landing-teal)]">
            {card.metric}
          </p>
        ) : null}
        <p className="whitespace-pre-line text-sm leading-7 text-[var(--landing-muted-text)]">
          {card?.description}
        </p>
        {card?.detail ? (
          <p className="border-t border-[var(--landing-line)] pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--landing-muted-text)]">
            {card.detail}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11 w-full rounded-xl border-[var(--landing-line)]"
          onClick={() => onOpenChange(false)}
        >
          <XIcon className="size-4" aria-hidden="true" />
          {hideLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
