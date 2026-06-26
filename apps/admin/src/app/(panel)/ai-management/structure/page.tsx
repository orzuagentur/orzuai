import { AiManagementStructurePanel } from "@/components/AiManagementStructurePanel";
import { fetchAiManagementOverviewAction } from "@/features/ai-management/actions";

export const metadata = {
  title: "Структура AI | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function AiManagementStructurePage() {
  const overview = await fetchAiManagementOverviewAction();

  return <AiManagementStructurePanel sections={overview.structure} />;
}
