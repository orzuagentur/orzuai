import Link from "next/link";

import { LEGAL_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type TermsAcceptanceFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function TermsAcceptanceField({
  checked,
  onChange,
  error,
  disabled = false,
  className,
}: TermsAcceptanceFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-4 rounded border border-input accent-primary"
          aria-invalid={Boolean(error)}
        />
        <span className="text-muted-foreground">
          I agree to the{" "}
          <Link
            href={LEGAL_ROUTES.terms}
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
