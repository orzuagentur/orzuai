import Link from "next/link";

import { LEGAL_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type LegalFooterLinksProps = {
  className?: string;
  inline?: boolean;
};

export function LegalFooterLinks({
  className,
  inline = true,
}: LegalFooterLinksProps) {
  const links = [
    { href: LEGAL_ROUTES.privacy, label: "Privacy Policy" },
    { href: LEGAL_ROUTES.terms, label: "Terms of Service" },
    { href: LEGAL_ROUTES.dataDeletion, label: "Data Deletion" },
  ] as const;

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
