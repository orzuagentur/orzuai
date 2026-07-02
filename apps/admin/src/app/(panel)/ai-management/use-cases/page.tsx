import { AiUseCaseCardsPanel } from "@/components/AiUseCaseCardsPanel";
import { fetchAiPlatformManagementAction } from "@/features/ai-management/platform-actions";

export default async function AiUseCasesPage() {
  const data = await fetchAiPlatformManagementAction();

  return (
    <AiUseCaseCardsPanel
      initialCards={data.useCaseCards}
      credentials={data.credentials}
      categories={data.categories}
    />
  );
}
