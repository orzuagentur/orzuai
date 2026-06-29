import { LegalPagesManager } from "@/components/LegalPagesManager";
import { fetchLegalPagesAction } from "@/features/legal-pages/actions";

export const metadata = {
  title: "Legal pages | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function LegalPagesAdminPage() {
  const { pages } = await fetchLegalPagesAction();
  const publicSiteOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://orzux.com";

  return (
    <LegalPagesManager
      initialPages={pages}
      publicSiteOrigin={publicSiteOrigin}
    />
  );
}
