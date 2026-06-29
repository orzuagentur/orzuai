import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { APP_ORIGIN } from "@/constants/app-origin";
import { APP_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { listFooterLegalLinks } from "@/services/legal-pages.service";

export default async function Home() {
  const [user, legalFooterLinks] = await Promise.all([
    getCurrentUser(),
    listFooterLegalLinks(),
  ]);

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OrzuX",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: APP_ORIGIN,
    description:
      "AI business communication platform with inbox, CRM, calendar, knowledge base, and autonomous AI agent workflows.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage legalFooterLinks={legalFooterLinks} />
    </>
  );
}
