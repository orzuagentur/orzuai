"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeEntryForm } from "@/hooks/use-knowledge-entry-form";
import { cn } from "@/lib/utils";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import { KNOWLEDGE_CATEGORY_META } from "@/features/knowledge-base/categories";
import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";

type KnowledgeEntryFormProps = {
  entry?: KnowledgeEntryData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
};

type FormErrors = Partial<
  Record<"title" | "content" | "category", string>
>;

export function KnowledgeEntryForm({
  entry,
  onSuccess,
  onCancel,
  className,
}: KnowledgeEntryFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const { save, isLoading, isEditMode } = useKnowledgeEntryForm({
    entry,
    onSuccess,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await save({
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      category: String(formData.get("category") ?? "") as (typeof KNOWLEDGE_CATEGORIES)[number],
    });

    if (!result.success && result.error.code === "VALIDATION_ERROR") {
      const message = result.error.message.toLowerCase();

      if (message.includes("title")) {
        setErrors({ title: result.error.message });
      } else if (message.includes("content")) {
        setErrors({ content: result.error.message });
      } else if (message.includes("category")) {
        setErrors({ category: result.error.message });
      }
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={cn("space-y-4", className)}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="knowledge-title">Title</Label>
        <Input
          id="knowledge-title"
          name="title"
          defaultValue={entry?.title ?? ""}
          placeholder="e.g. Opening hours, Delivery pricing"
          disabled={isLoading}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title ? (
          <p className="text-xs text-destructive">{errors.title}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="knowledge-category">Category</Label>
        <select
          id="knowledge-category"
          name="category"
          defaultValue={entry?.category ?? KNOWLEDGE_CATEGORIES[0]}
          disabled={isLoading}
          aria-invalid={Boolean(errors.category)}
          className={cn(
            "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {KNOWLEDGE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {KNOWLEDGE_CATEGORY_META[category].label}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p className="text-xs text-destructive">{errors.category}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="knowledge-content">Content</Label>
        <Textarea
          id="knowledge-content"
          name="content"
          defaultValue={entry?.content ?? ""}
          placeholder="Describe the information your AI should know..."
          className="min-h-32"
          disabled={isLoading}
          aria-invalid={Boolean(errors.content)}
        />
        {errors.content ? (
          <p className="text-xs text-destructive">{errors.content}</p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Saving...
            </>
          ) : isEditMode ? (
            "Save changes"
          ) : (
            "Add entry"
          )}
        </Button>
      </div>
    </form>
  );
}
