"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { deleteKnowledgeEntryAction } from "@/features/knowledge-base/actions/delete-knowledge-entry";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import type { DeleteKnowledgeEntryResult } from "@/types/knowledge.types";

type UseDeleteKnowledgeEntryOptions = {
  onSuccess?: () => void;
};

export function useDeleteKnowledgeEntry({
  onSuccess,
}: UseDeleteKnowledgeEntryOptions = {}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(
    async (entryId: string): Promise<DeleteKnowledgeEntryResult> => {
      setIsDeleting(true);

      try {
        const result = await deleteKnowledgeEntryAction(entryId);

        if (result.success) {
          toast.success(KNOWLEDGE_MESSAGES.deleteSuccess);
          onSuccess?.();
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess],
  );

  return {
    remove,
    isDeleting,
  };
}
