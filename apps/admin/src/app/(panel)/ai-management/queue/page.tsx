import { AiManagementQueuePanel } from "@/components/AiManagementQueuePanel";
import { fetchAiManagementOverviewAction } from "@/features/ai-management/actions";

export const metadata = {
  title: "Очередь LLM | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function AiManagementQueuePage() {
  const overview = await fetchAiManagementOverviewAction();

  return <AiManagementQueuePanel initialQueue={overview.providerQueue} />;
}
