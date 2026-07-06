import { NextResponse } from "next/server";

import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";

export async function GET() {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json({ sync: null }, { status: 200 });
    }

    const sync = await getWebsiteKnowledgeSync(business.id);

    return NextResponse.json({ sync });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
