"use client";

import { useEffect, useRef } from "react";
import { ListIcon, ListOrderedIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";

type ListMode = "none" | "numbered" | "bullet";

type AutoGrowDescriptionFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function getNextNumberedLine(value: string): string {
  const lines = value.split("\n");
  const last = lines[lines.length - 1] ?? "";
  const match = last.match(/^(\d+)\.\s*/);

  if (match) {
    return `${Number.parseInt(match[1] ?? "0", 10) + 1}. `;
  }

  const numberedCount = lines.filter((line) => /^\d+\.\s/.test(line)).length;
  return `${numberedCount + 1}. `;
}

export function AutoGrowDescriptionField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: AutoGrowDescriptionFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listModeRef = useRef<ListMode>("none");

  useEffect(() => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.max(96, element.scrollHeight)}px`;
  }, [value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || listModeRef.current === "none") {
      return;
    }

    event.preventDefault();
    const prefix =
      listModeRef.current === "numbered" ? getNextNumberedLine(value) : "• ";

    if (!value.trim()) {
      onChange(prefix);
      return;
    }

    onChange(`${value.replace(/\n$/, "")}\n${prefix}`);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        {label ? <Label htmlFor={id}>{label}</Label> : null}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={ORZUX_CALENDAR_MESSAGES.numberedList}
            onClick={() => {
              listModeRef.current = "numbered";
              onChange(value.trim() ? `${value}\n1. ` : "1. ");
            }}
          >
            <ListOrderedIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={ORZUX_CALENDAR_MESSAGES.bulletList}
            onClick={() => {
              listModeRef.current = "bullet";
              onChange(value.trim() ? `${value}\n• ` : "• ");
            }}
          >
            <ListIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-24 resize-none overflow-hidden"
      />
    </div>
  );
}
