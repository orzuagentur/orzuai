export function maskSecretValue(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "—";
  }

  if (trimmed.length <= 4) {
    return "*".repeat(trimmed.length);
  }

  if (trimmed.length <= 8) {
    return `${"*".repeat(trimmed.length - 2)}${trimmed.slice(-2)}`;
  }

  const prefixMatch = trimmed.match(/^([a-zA-Z]{2,10}[-_])/);
  const prefix = prefixMatch?.[1] ?? "";
  const suffix = trimmed.slice(-4);
  const hiddenLength = Math.max(trimmed.length - prefix.length - 4, 4);

  return `${prefix}${"*".repeat(hiddenLength)}${suffix}`;
}
