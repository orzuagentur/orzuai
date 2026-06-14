import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { syncConversationMessageGap } from "@/services/conversation-gap-sync.service";

const gapSyncSchema = z.object({
  afterCreatedAt: z.string().min(1),
  afterMessageId: z.string().uuid().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: CHAT_MESSAGES.missingConfig },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 400 });
  }

  const { conversationId } = await context.params;
  const parsed = gapSyncSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await syncConversationMessageGap(
    conversationId,
    business.id,
    {
      afterCreatedAt: parsed.data.afterCreatedAt,
      afterMessageId: parsed.data.afterMessageId ?? null,
    },
  );

  if (!result) {
    return NextResponse.json(
      { error: CHAT_MESSAGES.genericError },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    ...result,
  });
}
