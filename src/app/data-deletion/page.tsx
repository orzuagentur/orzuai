import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY, LEGAL_MESSAGES } from "@/features/legal/constants";
import { DATA_DELETION_SECTIONS } from "@/features/legal/content";

export const metadata: Metadata = {
  title: `${LEGAL_MESSAGES.dataDeletionTitle} | ${LEGAL_COMPANY.name}`,
  description: `Instructions for deleting your ${LEGAL_COMPANY.name} account and associated personal data.`,
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell
      title={LEGAL_MESSAGES.dataDeletionTitle}
      description={`How to request deletion of your account and data. Last updated: ${LEGAL_COMPANY.lastUpdated}`}
    >
      <LegalDocument sections={DATA_DELETION_SECTIONS} />
    </LegalPageShell>
  );
}
