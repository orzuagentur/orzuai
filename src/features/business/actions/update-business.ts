"use server";

import { updateBusiness } from "@/services/business.service";
import type {
  BusinessProfileInput,
  UpdateBusinessResult,
} from "@/types/business.types";

export async function updateBusinessAction(
  businessId: string,
  input: BusinessProfileInput,
): Promise<UpdateBusinessResult> {
  return updateBusiness(businessId, input);
}
