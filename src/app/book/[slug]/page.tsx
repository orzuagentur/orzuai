import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicBookingView } from "@/components/booking-page/PublicBookingView";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { getPublicBookingPageSlots } from "@/services/public-booking.service";

type PublicBookPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicBookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBookingPageSlots(slug);

  if (!data) {
    return { title: ORZUX_CALENDAR_MESSAGES.publicPageUnavailable };
  }

  return {
    title: `${data.page.title} · ${data.page.businessName}`,
    description: `Book an appointment with ${data.page.businessName}`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicBookPage({ params }: PublicBookPageProps) {
  const { slug } = await params;
  const data = await getPublicBookingPageSlots(slug);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <PublicBookingView
        page={data.page}
        formFields={data.page.formFields}
        resources={data.resources.map((resource) => ({
          name: resource.name,
          resourceType: resource.resourceType,
          durationMinutes: resource.durationMinutes,
        }))}
        initialSlots={data.slots}
        initialDate={data.selectedDate}
      />
    </main>
  );
}
