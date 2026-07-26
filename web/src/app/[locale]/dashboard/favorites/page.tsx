import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LibraryStudio } from "@/components/LibraryStudio";

export default async function LibraryPage() {
  const tCommon = await getTranslations("common");
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[color:var(--muted)]">{tCommon("loading")}</p>
      }
    >
      <LibraryStudio />
    </Suspense>
  );
}
