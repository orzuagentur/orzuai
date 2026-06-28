"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES, PUBLIC_ROUTES } from "@/constants/routes";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { getBusinessTypePreset } from "@/lib/calendar/business-type-presets";
import type { BookingPageRecord } from "@/types/booking-page.types";

type BookingPagesManagerProps = {
  pages: BookingPageRecord[];
};

export function BookingPagesManager({ pages }: BookingPagesManagerProps) {
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete(pageId: string) {
    startDeleting(async () => {
      try {
        const response = await fetch(`/api/calendar/booking-page?pageId=${pageId}`, {
          method: "DELETE",
        });
        const result = (await response.json()) as { success: boolean; message?: string };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed);
          return;
        }

        toast.success(ORZUX_CALENDAR_MESSAGES.pageDeleted);
        router.refresh();
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b px-4 py-4 md:px-6">
        <div>
          <h1 className="text-lg font-medium">{ORZUX_CALENDAR_MESSAGES.manageBookingPages}</h1>
          <p className="text-sm text-muted-foreground">
            {ORZUX_CALENDAR_MESSAGES.bookingPageSubtitle}
          </p>
        </div>
        <Button asChild>
          <Link href={DASHBOARD_ROUTES.calendarBookingNew}>
            <PlusIcon className="size-4" />
            {ORZUX_CALENDAR_MESSAGES.createNewPage}
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {pages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center">
            <CalendarClockIcon className="mb-4 size-10 text-primary" />
            <h2 className="text-lg font-medium">{ORZUX_CALENDAR_MESSAGES.noBookingPagesYet}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {ORZUX_CALENDAR_MESSAGES.noBookingPagesHint}
            </p>
            <Button className="mt-6" asChild>
              <Link href={DASHBOARD_ROUTES.calendarBookingNew}>
                <PlusIcon className="size-4" />
                {ORZUX_CALENDAR_MESSAGES.createBookingPage}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-3">
            {pages.map((page) => {
              const typeLabel = getBusinessTypePreset(page.businessType).label;

              return (
                <div
                  key={page.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{page.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {page.published
                        ? ORZUX_CALENDAR_MESSAGES.bookingPageActive
                        : ORZUX_CALENDAR_MESSAGES.bookingPageDraft}
                      {" · "}
                      {typeLabel}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {PUBLIC_ROUTES.book(page.slug)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {page.published ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={PUBLIC_ROUTES.book(page.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLinkIcon className="size-4" />
                          {ORZUX_CALENDAR_MESSAGES.openPublicPage}
                        </a>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${DASHBOARD_ROUTES.calendarBooking}/${page.id}`}>
                        {ORZUX_CALENDAR_MESSAGES.editPage}
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDeleting}
                      aria-label={ORZUX_CALENDAR_MESSAGES.deletePage}
                      onClick={() => handleDelete(page.id)}
                    >
                      {isDeleting ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
