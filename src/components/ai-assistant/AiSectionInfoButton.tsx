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

type AiSectionInfoButtonProps = {
  title: string;
  body: string;
};

export function AiSectionInfoButton({ title, body }: AiSectionInfoButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`About ${title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <CircleHelpIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
