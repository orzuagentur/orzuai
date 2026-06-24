"use server";

import { generateBusinessCalendarFromKnowledgeForUser } from "@/services/business-calendar-setup.service";

export async function setupCalendarFromKnowledgeAction(): Promise<
  | {
      success: true;
      businessTypeLabel: string;
      resourceCount: number;
      resourceNames: string[];
    }
  | { success: false; message: string }
> {
  const result = await generateBusinessCalendarFromKnowledgeForUser();

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    businessTypeLabel: result.setup.businessTypeLabel,
    resourceCount: result.replacedCount,
    resourceNames: result.resources.map((resource) => resource.name),
  };
}
