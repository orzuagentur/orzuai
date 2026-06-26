import { AiExpensesPanel } from "@/components/AiExpensesPanel";
import { fetchAiExpensesAction } from "@/features/dashboard/actions";

type AiExpensesPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AiExpensesPage({
  searchParams,
}: AiExpensesPageProps) {
  const params = await searchParams;
  const data = await fetchAiExpensesAction(params.period);

  return <AiExpensesPanel initialData={data} />;
}
