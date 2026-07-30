import { redirect } from "@/i18n/navigation";

/** Alias — Creativity lives at /dashboard/content */
export default async function CreativityAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/dashboard/content", locale });
}
