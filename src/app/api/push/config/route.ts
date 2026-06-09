import { NextResponse } from "next/server";

import { getVapidPublicKey, hasPushEnv } from "@/lib/env";

export function GET() {
  const enabled = hasPushEnv();

  return NextResponse.json({
    enabled,
    vapidPublicKey: enabled ? getVapidPublicKey() : null,
  });
}
