"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type AppLocale } from "@/i18n/routing";

export function LanguageSwitcher({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      {!compact ? (
        <span className="sr-only">{t("language")}</span>
      ) : null}
      <select
        className="rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--fg)] outline-none transition hover:border-[color:rgba(var(--accent-rgb),0.4)] focus:border-[color:var(--accent)]"
        value={locale}
        aria-label={t("language")}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          router.replace(pathname, { locale: next });
        }}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
