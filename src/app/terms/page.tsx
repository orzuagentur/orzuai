import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY, LEGAL_MESSAGES } from "@/features/legal/constants";
import { TERMS_OF_SERVICE_SECTIONS } from "@/features/legal/content";

export const metadata: Metadata = {
  title: `${LEGAL_MESSAGES.termsTitle} | ${LEGAL_COMPANY.name}`,
  description: `Terms and conditions for using the ${LEGAL_COMPANY.name} platform.`,
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      title={LEGAL_MESSAGES.termsTitle}
      description={`Last updated: ${LEGAL_COMPANY.lastUpdated}`}
    >
      <LegalDocument sections={TERMS_OF_SERVICE_SECTIONS} />
    </LegalPageShell>
  );
}
