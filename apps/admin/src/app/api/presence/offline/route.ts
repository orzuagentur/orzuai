import { NextResponse } from "next/server";

import { markOfflineAction } from "@/features/team/presence-actions";

export async function POST() {
  await markOfflineAction({ eventType: "offline" });
  return NextResponse.json({ success: true });
}
