import { BusinessDetailPanel } from "@/components/businesses/BusinessDetailPanel";

type BusinessDetailPageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { businessId } = await params;
  return <BusinessDetailPanel businessId={businessId} />;
}
