"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  LANDING_LOCALE_LABELS,
  LANDING_LOCALES,
  resolveLandingLocale,
  type LandingLocale,
} from "@/features/landing/i18n";
import { cn } from "@/lib/utils";

export function LandingLanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = resolveLandingLocale(searchParams.get("lang"));

  function setLocale(locale: LandingLocale) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
      {LANDING_LOCALES.map((locale) => (
        <Button
          key={locale}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 min-w-9 rounded-full px-2 text-xs",
            activeLocale === locale
              ? "bg-primary/20 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setLocale(locale)}
        >
          {LANDING_LOCALE_LABELS[locale]}
        </Button>
      ))}
    </div>
  );
}
