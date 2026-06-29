import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { BrandMark } from "@/components/brand/BrandMark";
import { APP_ROUTES } from "@/constants/routes";
import type { LegalFooterLink } from "@/features/legal/types";
import { LEGAL_MESSAGES } from "@/features/legal/constants";

type LegalPageShellProps = {
  title: string;
  description: string;
  footerLinks: LegalFooterLink[];
  children: ReactNode;
};

export function LegalPageShell({
  title,
  description,
  footerLinks,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <BrandMark />
          <Link
            href={APP_ROUTES.home}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            {LEGAL_MESSAGES.backToHome}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="space-y-2 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children}
      </main>

      <footer className="border-t px-6 py-8 text-center text-xs text-muted-foreground">
        <LegalFooterLinks links={footerLinks} className="mb-4" />
        <p>© {new Date().getFullYear()} OrzuX. All rights reserved.</p>
      </footer>
    </div>
  );
}
