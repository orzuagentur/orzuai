"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PlatformGuide = {
  id: string;
  label: string;
  steps: readonly string[];
};

type IntegrationPlatformGuideProps = {
  guides: readonly PlatformGuide[];
  className?: string;
};

export function IntegrationPlatformGuide({
  guides,
  className,
}: IntegrationPlatformGuideProps) {
  const [openId, setOpenId] = useState<string | null>(guides[0]?.id ?? null);

  return (
    <div className={cn("space-y-2", className)}>
      {guides.map((guide) => {
        const isOpen = openId === guide.id;

        return (
          <div key={guide.id} className="rounded-lg border bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
              onClick={() => setOpenId(isOpen ? null : guide.id)}
            >
              {guide.label}
              <ChevronDownIcon
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen ? (
              <ol className="list-decimal space-y-2 border-t px-4 py-3 pl-8 text-sm leading-relaxed text-muted-foreground">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
