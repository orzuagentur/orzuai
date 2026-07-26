"use client";

import { useTranslations } from "next-intl";

/** Localized job pipeline status labels (Creativity / docks / cards). */
export function useJobStatusLabel() {
  const t = useTranslations("studio.status");
  return (status: string): string => {
    const known = [
      "queued",
      "generating_script",
      "generating_voice",
      "fetching_media",
      "editing",
      "uploading",
      "ready",
      "scheduled",
      "published",
      "failed",
    ] as const;
    if ((known as readonly string[]).includes(status)) {
      return t(status as (typeof known)[number]);
    }
    return status;
  };
}
