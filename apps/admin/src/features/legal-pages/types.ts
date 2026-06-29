import type { LegalPageRecord, LegalSection } from "@orzuai/features/legal/types";

export type { LegalPageRecord, LegalSection };

export type SaveLegalPageInput = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  footerLabel: string;
  sections: LegalSection[];
  sortOrder: number;
  published: boolean;
  showInFooter: boolean;
};
