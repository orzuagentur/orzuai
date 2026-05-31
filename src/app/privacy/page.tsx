import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LEGAL_COMPANY, LEGAL_MESSAGES } from "@/features/legal/constants";
import { PRIVACY_POLICY_SECTIONS } from "@/features/legal/content";

export const metadata: Metadata = {
  title: `${LEGAL_MESSAGES.privacyTitle} | ${LEGAL_COMPANY.name}`,
  description: `How ${LEGAL_COMPANY.name} collects, uses, and protects personal information.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title={LEGAL_MESSAGES.privacyTitle}
      description={`Last updated: ${LEGAL_COMPANY.lastUpdated}`}
    >
      <LegalDocument sections={PRIVACY_POLICY_SECTIONS} />
    </LegalPageShell>
  );
}
