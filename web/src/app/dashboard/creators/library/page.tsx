import { redirect } from "next/navigation";
import { isStudioKind } from "@/lib/studio-kind";

/** Legacy entry → dedicated /library/[kind] pages. */
export default async function CreatorsLibraryIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const sp = await searchParams;
  const kind = String(sp.kind || "photos").toLowerCase();
  redirect(
    `/dashboard/creators/library/${isStudioKind(kind) ? kind : "photos"}`,
  );
}
