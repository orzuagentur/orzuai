import { AiManagementStructurePanel } from "@/components/AiManagementStructurePanel";
import { fetchAiStructureLiveAction } from "@/features/ai-management/structure-actions";

export const metadata = {
  title: "Структура AI | OrzuX Admin",
  robots: { index: false, follow: false },
};

export default async function AiManagementStructurePage() {
  const data = await fetchAiStructureLiveAction();

  return <AiManagementStructurePanel data={data} />;
}
