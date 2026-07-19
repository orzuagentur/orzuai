"use client";

import { evaluatePasswordStrength } from "@/features/auth/password-strength";
import { cn } from "@/lib/utils";

type PasswordStrengthMeterProps = {
  password: string;
  className?: string;
};

export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = evaluatePasswordStrength(password);
  const rules = [
    { key: "letters", label: "5 letters", status: strength.letters },
    { key: "symbols", label: "3 symbols", status: strength.symbols },
    { key: "digits", label: "2 digits", status: strength.digits },
  ] as const;

  return (
    <ul
      className={cn(
        "flex h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs",
        className,
      )}
      aria-live="polite"
    >
      {!password ? (
        <li className="text-muted-foreground">
          5 letters · 3 symbols · 2 digits
        </li>
      ) : (
        rules.map((rule) => (
          <li
            key={rule.key}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap",
              rule.status.ok ? "text-zinc-800" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                rule.status.ok ? "bg-zinc-800" : "bg-zinc-300",
              )}
              aria-hidden="true"
            />
            <span>
              {rule.label}
              <span className="ml-1 text-muted-foreground">
                ({rule.status.current}/{rule.status.required})
              </span>
            </span>
          </li>
        ))
      )}
    </ul>
  );
}
