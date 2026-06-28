export function slugifyBookingPageTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "booking";
}

export function appendSlugSuffix(slug: string, suffix: string): string {
  const normalizedSuffix = suffix.replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${slug}-${normalizedSuffix}`.slice(0, 64);
}
