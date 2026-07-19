import type { Metadata } from "next";

import { DocsOverview } from "@/components/docs/DocsOverview";
import { DocsShell } from "@/components/docs/DocsShell";
import { DOCS_OVERVIEW } from "@/features/docs/content";

export const metadata: Metadata = {
  title: "Documentation",
  description: DOCS_OVERVIEW.summary,
};

export default function DocsIndexPage() {
  return (
    <DocsShell>
      <DocsOverview />
    </DocsShell>
  );
}
