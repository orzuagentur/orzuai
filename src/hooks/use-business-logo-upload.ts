"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { uploadBusinessLogoAction } from "@/features/business/actions/upload-business-logo";
import { BUSINESS_MESSAGES } from "@/features/business/constants";
import type { UploadBusinessLogoResult } from "@/types/business.types";
import { BUSINESS_LOGO_FIELD } from "@/types/business.types";

type UseBusinessLogoUploadOptions = {
  businessId?: string;
  onSuccess?: (logoUrl: string) => void;
};

export function useBusinessLogoUpload({
  businessId,
  onSuccess,
}: UseBusinessLogoUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<UploadBusinessLogoResult> => {
      if (!businessId) {
        const message = BUSINESS_MESSAGES.logoRequiresBusiness;
        toast.error(message);

        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message,
          },
        };
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append(BUSINESS_LOGO_FIELD, file);

        const result = await uploadBusinessLogoAction(businessId, formData);

        if (result.success) {
          toast.success(BUSINESS_MESSAGES.logoUploadSuccess);
          onSuccess?.(result.data.logoUrl);
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsUploading(false);
      }
    },
    [businessId, onSuccess],
  );

  return {
    upload,
    isUploading,
    canUpload: Boolean(businessId),
  };
}
