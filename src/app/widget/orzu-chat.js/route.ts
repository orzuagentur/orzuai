import { NextResponse } from "next/server";

import { buildAppUrl } from "@/lib/app-url";
import { buildWebsiteChatWidgetScript } from "@/lib/website-chat/widget-script";

export async function GET() {
  const apiBase = buildAppUrl("/api/widget/chat");
  const script = buildWebsiteChatWidgetScript(apiBase);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
