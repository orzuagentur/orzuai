import { DashboardOverview } from "@/components/DashboardOverview";
import { fetchDashboardMetricsAction } from "@/features/dashboard/actions";

export default async function DashboardPage() {
  const metrics = await fetchDashboardMetricsAction();

  return <DashboardOverview metrics={metrics} />;
}
