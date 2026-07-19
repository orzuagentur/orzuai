import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { OrdersPanel } from "@/components/orders/OrdersPanel";
import { ORDERS_MESSAGES } from "@/features/orders/constants";
import { getCrmOrdersPageData } from "@/services/crm-orders.service";
import { getOwnedOrderFormFields } from "@/services/order-form-fields.service";

type OrdersPageProps = {
  searchParams: Promise<{ status?: string; q?: string; order?: string }>;
};

export default function OrdersPage({ searchParams }: OrdersPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <OrdersPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersPageContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; order?: string }>;
}) {
  const params = await searchParams;
  const [data, formFields] = await Promise.all([
    getCrmOrdersPageData({
      status: params.status,
      q: params.q,
      orderId: params.order,
    }),
    getOwnedOrderFormFields(),
  ]);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={ORDERS_MESSAGES.pageTitle}
        description="Create your business profile to receive orders and requests."
      />
    );
  }

  return <OrdersPanel data={data} formFields={formFields} />;
}
