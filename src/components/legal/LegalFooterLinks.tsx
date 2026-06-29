import Link from "next/link";

import type { LegalFooterLink } from "@/features/legal/types";
import { cn } from "@/lib/utils";

type LegalFooterLinksProps = {
  links: LegalFooterLink[];
  className?: string;
  inline?: boolean;
};

export function LegalFooterLinks({
  links,
  className,
  inline = true,
}: LegalFooterLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        inline
          ? "flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
          : "flex flex-col gap-2",
        className,
      )}
      aria-label="Legal"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
