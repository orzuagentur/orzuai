"use server";

import { verifyWhatsAppNumber } from "@/services/whatsapp.service";
import type {
  VerifyWhatsAppInput,
  VerifyWhatsAppResult,
} from "@/types/whatsapp.types";

export async function verifyWhatsAppAction(
  input: VerifyWhatsAppInput,
): Promise<VerifyWhatsAppResult> {
  return verifyWhatsAppNumber(input);
}
