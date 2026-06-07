"use server";

import { disconnectInstagram } from "@/services/instagram.service";

export async function disconnectInstagramAction() {
  return disconnectInstagram();
}
