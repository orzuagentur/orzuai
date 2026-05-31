"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { createKnowledgeEntryAction } from "@/features/knowledge-base/actions/create-knowledge-entry";
import { updateKnowledgeEntryAction } from "@/features/knowledge-base/actions/update-knowledge-entry";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type {
  CreateKnowledgeEntryResult,
  KnowledgeEntryData,
  KnowledgeEntryInput,
  UpdateKnowledgeEntryResult,
} from "@/types/knowledge.types";

type UseKnowledgeEntryFormOptions = {
  entry?: KnowledgeEntryData | null;
  onSuccess?: () => void;
};

export function useKnowledgeEntryForm({
  entry,
  onSuccess,
}: UseKnowledgeEntryFormOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = Boolean(entry?.id);

  const save = useCallback(
    async (
      input: KnowledgeEntryInput,
    ): Promise<CreateKnowledgeEntryResult | UpdateKnowledgeEntryResult> => {
      setIsLoading(true);

      try {
        const result = isEditMode
          ? await updateKnowledgeEntryAction(entry!.id, input)
          : await createKnowledgeEntryAction(input);

        if (result.success) {
          toast.success(
            isEditMode
              ? KNOWLEDGE_MESSAGES.updateSuccess
              : KNOWLEDGE_MESSAGES.createSuccess,
          );
          onSuccess?.();
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [entry, isEditMode, onSuccess],
  );

  return {
    save,
    isLoading,
    isEditMode,
  };
}
