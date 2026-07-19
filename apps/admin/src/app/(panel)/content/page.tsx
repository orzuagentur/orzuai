import { SiteContentIndex } from "@/components/site-content/SiteContentIndex";
import {
  ensureSiteContentCatalogAction,
  listSiteDocumentsAction,
} from "@/features/site-content/actions";

export const metadata = {
  title: "Content Studio | OrzuX Admin",
  robots: { index: false, follow: false },
};

type ContentPageProps = {
  searchParams: Promise<{ locale?: string }>;
};

export default async function ContentStudioPage({ searchParams }: ContentPageProps) {
  const params = await searchParams;
  const locale =
    params.locale === "ru" || params.locale === "uz" ? params.locale : "en";

  await ensureSiteContentCatalogAction(locale);
  const { documents, error } = await listSiteDocumentsAction(locale);

  return (
    <div>
      {error ? (
        <p className="p-6 text-sm text-destructive">{error}</p>
      ) : null}
      <SiteContentIndex documents={documents} locale={locale} />
    </div>
  );
}
