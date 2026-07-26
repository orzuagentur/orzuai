"use client";

import { useTranslations } from "next-intl";
import {
  getPasswordChecks,
  getPasswordStrength,
  PASSWORD_MIN_LENGTH,
  type PasswordStrength,
} from "@/lib/password";

const STRENGTH_COLOR: Record<Exclude<PasswordStrength, "empty">, string> = {
  weak: "var(--danger)",
  fair: "#e8a54b",
  strong: "#3ecf8e",
};

/** Live checklist + strength label under a password field. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const t = useTranslations("studio.password");
  const tc = useTranslations("studio.common");
  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(password);
  if (!password) {
    return (
      <p className="text-xs text-[color:var(--muted)]">
        {t("hint", { n: PASSWORD_MIN_LENGTH })}
      </p>
    );
  }

  const items = [
    { ok: checks.length, label: t("minChars", { n: PASSWORD_MIN_LENGTH }) },
    { ok: checks.letter, label: t("letter") },
    { ok: checks.number, label: t("number") },
    { ok: checks.symbol, label: t("symbol") },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[color:var(--muted)]">{t("strength")}</span>
        {strength !== "empty" && (
          <span
            className="text-xs font-semibold"
            style={{ color: STRENGTH_COLOR[strength] }}
          >
            {tc(strength)}
          </span>
        )}
      </div>
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((i) => {
          const filled =
            strength === "strong" ||
            (strength === "fair" && i <= 2) ||
            (strength === "weak" && i === 1);
          return (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{
                background: filled
                  ? STRENGTH_COLOR[strength]
                  : "rgba(255,255,255,0.12)",
              }}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {items.map((item) => (
          <li
            key={item.label}
            style={{ color: item.ok ? "#3ecf8e" : "var(--muted)" }}
          >
            {item.ok ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
