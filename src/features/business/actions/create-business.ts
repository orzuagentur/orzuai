"use server";

import { createBusiness } from "@/services/business.service";
import type {
  BusinessProfileInput,
  CreateBusinessResult,
} from "@/types/business.types";

export async function createBusinessAction(
  input: BusinessProfileInput,
): Promise<CreateBusinessResult> {
  return createBusiness(input);
}
