export type { LegalFooterLink, LegalPageRecord, LegalSection } from "@/features/legal/types";
export {
  DEFAULT_LEGAL_PAGES,
  LEGAL_COMPANY,
  isReservedLegalSlug,
  legalPagePath,
} from "@/features/legal/default-pages";

import { DEFAULT_LEGAL_PAGES } from "@/features/legal/default-pages";

export const PRIVACY_POLICY_SECTIONS =
  DEFAULT_LEGAL_PAGES.find((page) => page.slug === "privacy")?.sections ?? [];

export const TERMS_OF_SERVICE_SECTIONS =
  DEFAULT_LEGAL_PAGES.find((page) => page.slug === "terms")?.sections ?? [];

export const DATA_DELETION_SECTIONS =
  DEFAULT_LEGAL_PAGES.find((page) => page.slug === "data-deletion")?.sections ?? [];
