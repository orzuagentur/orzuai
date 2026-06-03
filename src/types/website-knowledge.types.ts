import { z } from "zod";

export const WEBSITE_KNOWLEDGE_SYNC_INTERVALS = [
  { hours: 24, label: "Every day" },
  { hours: 72, label: "Every 3 days" },
  { hours: 168, label: "Every week" },
] as const;

export const websiteKnowledgeSetupSchema = z.object({
  siteUrl: z
    .string()
    .trim()
    .min(4, "Enter your website address.")
    .max(2048)
    .refine(
      (value) => {
        try {
          const url = new URL(value.startsWith("http") ? value : `https://${value}`);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Enter a valid website URL (e.g. https://example.com)." },
    ),
  autoSyncEnabled: z.boolean().optional(),
  syncIntervalHours: z.coerce.number().int().min(24).max(720).optional(),
});

export type WebsiteKnowledgeSetupInput = z.infer<typeof websiteKnowledgeSetupSchema>;

export type WebsiteKnowledgeSyncStatus = "idle" | "syncing" | "ready" | "error";

export type WebsiteKnowledgeSyncData = {
  id: string;
  businessId: string;
  siteUrl: string;
  syncStatus: WebsiteKnowledgeSyncStatus;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  lastSyncError: string | null;
  pagesIndexed: number;
  entriesSynced: number;
};

export type SaveWebsiteKnowledgeResult =
  | { success: true; data: WebsiteKnowledgeSyncData }
  | { success: false; error: { code: string; message: string } };

export type SyncWebsiteKnowledgeResult =
  | {
      success: true;
      data: {
        pagesIndexed: number;
        entriesSynced: number;
      };
    }
  | { success: false; error: { code: string; message: string } };
