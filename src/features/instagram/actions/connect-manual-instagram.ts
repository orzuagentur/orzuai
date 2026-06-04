"use server";

import { connectManualInstagram } from "@/services/instagram.service";
import type {
  ConnectManualInstagramInput,
  ConnectManualInstagramResult,
} from "@/types/instagram.types";

export async function connectManualInstagramAction(
  input: ConnectManualInstagramInput,
): Promise<ConnectManualInstagramResult> {
  return connectManualInstagram(input);
}
