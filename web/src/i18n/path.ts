import type { AppLocale } from "./routing";
import { locales } from "./routing";

/** Strip /en|/ru|/de prefix for auth path matching. */
export function stripLocale(pathname: string): {
  locale: AppLocale | null;
  pathnameWithoutLocale: string;
} {
  const parts = pathname.split("/");
  // ["", "en", "dashboard", ...]
  const maybe = parts[1];
  if (maybe && (locales as readonly string[]).includes(maybe)) {
    const rest = "/" + parts.slice(2).join("/");
    return {
      locale: maybe as AppLocale,
      pathnameWithoutLocale: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/",
    };
  }
  return { locale: null, pathnameWithoutLocale: pathname };
}

export function withLocale(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}
