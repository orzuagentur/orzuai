import { notFound } from "next/navigation";

import { SiteDocumentEditor } from "@/components/site-content/SiteDocumentEditor";
import { getSiteDocumentAction } from "@/features/site-content/actions";

export const metadata = {
  title: "Edit content | OrzuX Admin",
  robots: { index: false, follow: false },
};

type EditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContentEditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const { document, error } = await getSiteDocumentAction(id);

  if (error || !document) {
    notFound();
  }

  const publicSiteOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://orzux.com";

  return (
    <SiteDocumentEditor
      document={document}
      publicSiteOrigin={publicSiteOrigin}
    />
  );
}
