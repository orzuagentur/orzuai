"use server";

import { uploadBusinessLogo } from "@/services/business.service";
import type { UploadBusinessLogoResult } from "@/types/business.types";
import { BUSINESS_LOGO_FIELD } from "@/types/business.types";

export async function uploadBusinessLogoAction(
  businessId: string,
  formData: FormData,
): Promise<UploadBusinessLogoResult> {
  const file = formData.get(BUSINESS_LOGO_FIELD);

  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: {
        code: "LOGO_INVALID",
        message: "Select an image file to upload.",
      },
    };
  }

  return uploadBusinessLogo(businessId, file);
}
