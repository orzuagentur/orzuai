import { AiExpensesOverview } from "@/components/AiExpensesOverview";
import { fetchAiExpensesAction } from "@/features/dashboard/actions";

export default async function AiExpensesPage() {
  const data = await fetchAiExpensesAction();

  return <AiExpensesOverview data={data} />;
}
