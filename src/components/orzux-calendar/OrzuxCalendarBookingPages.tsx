"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES, PUBLIC_ROUTES } from "@/constants/routes";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { getBusinessTypePreset } from "@/lib/calendar/business-type-presets";
import type { BookingPageRecord } from "@/types/booking-page.types";

type OrzuxCalendarBookingPagesProps = {
  pages: BookingPageRecord[];
};

function getPublicPageUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${PUBLIC_ROUTES.book(slug)}`;
  }

  return PUBLIC_ROUTES.book(slug);
}

export function OrzuxCalendarBookingPages({ pages }: OrzuxCalendarBookingPagesProps) {
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();

  async function handleCopyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(getPublicPageUrl(slug));
      toast.success(ORZUX_CALENDAR_MESSAGES.linkCopied);
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.copyLinkFailed);
    }
  }

  function handleSendPage(page: BookingPageRecord) {
    const url = getPublicPageUrl(page.slug);
    const title = page.title || ORZUX_CALENDAR_MESSAGES.defaultBookingPageName;
    const subject = encodeURIComponent(`${title} — ${ORZUX_CALENDAR_MESSAGES.publicBookTitle}`);
    const body = encodeURIComponent(
      `${ORZUX_CALENDAR_MESSAGES.sendPageMessage}\n\n${url}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

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
    <section className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.bookingPagesTitle}</h3>
        {pages.length > 0 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {pages.length > 9 ? "9+" : pages.length}
          </span>
        ) : null}
      </div>

      {pages.length === 0 ? (
        <p className="text-xs text-muted-foreground">{ORZUX_CALENDAR_MESSAGES.noBookingPagesHint}</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {pages.map((page) => {
            const typeLabel = getBusinessTypePreset(page.businessType).label;

            return (
              <div
                key={page.id}
                className="rounded-md border bg-background px-2 py-2"
              >
                <div className="flex items-start gap-2">
                  <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {page.title || ORZUX_CALENDAR_MESSAGES.defaultBookingPageName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {page.published
                        ? ORZUX_CALENDAR_MESSAGES.bookingPageActive
                        : ORZUX_CALENDAR_MESSAGES.bookingPageDraft}
                      {" · "}
                      {typeLabel}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{PUBLIC_ROUTES.book(page.slug)}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" asChild>
                    <Link href={`${DASHBOARD_ROUTES.calendarBooking}/${page.id}`}>
                      <PencilIcon className="size-3" />
                      {ORZUX_CALENDAR_MESSAGES.editPage}
                    </Link>
                  </Button>
                  {page.published ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => void handleCopyLink(page.slug)}
                      >
                        <CopyIcon className="size-3" />
                        {ORZUX_CALENDAR_MESSAGES.copyPublicLink}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleSendPage(page)}
                      >
                        <MailIcon className="size-3" />
                        {ORZUX_CALENDAR_MESSAGES.sendPage}
                      </Button>
                      <a
                        href={PUBLIC_ROUTES.book(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted"
                      >
                        <ExternalLinkIcon className="size-3" />
                        {ORZUX_CALENDAR_MESSAGES.openPublicPage}
                      </a>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => handleDelete(page.id)}
                  >
                    {isDeleting ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
