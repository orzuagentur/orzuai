import { PlatformSupportPanel } from "@/components/support/PlatformSupportPanel";

type SupportPageProps = {
  searchParams: Promise<{ thread?: string; business?: string }>;
};

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  return <PlatformSupportPanel initialThreadId={params.thread ?? null} />;
}
