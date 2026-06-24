"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  filterAiReplyLanguages,
  formatAiReplyLanguageLabel,
  MULTILINGUAL_LANGUAGE_VALUE,
} from "@/lib/ai/languages";
import { cn } from "@/lib/utils";

type AiLanguageSelectProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function AiLanguageSelect({
  value,
  disabled = false,
  onChange,
}: AiLanguageSelectProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(
    () => filterAiReplyLanguages(search),
    [search],
  );

  const pinnedOption = filteredOptions.find(
    (option) => option.value === MULTILINGUAL_LANGUAGE_VALUE,
  );
  const otherOptions = filteredOptions.filter(
    (option) => option.value !== MULTILINGUAL_LANGUAGE_VALUE,
  );

  return (
    <div className="space-y-2">
      <Label>{AI_ASSISTANT_MESSAGES.assistantLanguageLabel}</Label>
      <p className="text-xs text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.assistantLanguageHint}
      </p>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          disabled={disabled}
          placeholder={AI_ASSISTANT_MESSAGES.languageSearchPlaceholder}
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Selected: {formatAiReplyLanguageLabel(value)}
      </p>

      <div className="max-h-64 overflow-y-auto rounded-lg border">
        {pinnedOption ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(pinnedOption.value)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b px-3 py-3 text-left transition-colors",
              value === pinnedOption.value
                ? "bg-primary/5"
                : "hover:bg-muted/50",
              disabled && "opacity-60",
            )}
          >
            <span className="text-sm font-medium">{pinnedOption.label}</span>
            <span className="text-xs text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.multilingualDescription}
            </span>
          </button>
        ) : null}

        {otherOptions.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.languageSearchEmpty}
          </p>
        ) : (
          <ul>
            {otherOptions.map((option) => {
              const isSelected = value === option.value;

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                      disabled && "opacity-60",
                    )}
                  >
                    <span className="text-sm">{option.label}</span>
                    {option.nativeLabel ? (
                      <span className="text-xs text-muted-foreground">
                        {option.nativeLabel}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
