import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { AUTH_ROUTES, APP_ROUTES } from "@/constants/routes";
import { DOCS_ROUTES } from "@/features/docs/nav";

type DocsShellProps = {
  children: ReactNode;
  activeSlug?: string | null;
};

export function DocsShell({ children, activeSlug = null }: DocsShellProps) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href={APP_ROUTES.home}
              className="inline-flex items-center gap-2.5 text-zinc-900"
              aria-label="OrzuX home"
            >
              <BrandMark size={28} tone="on-light" />
              <BrandWordmark size="sm" />
            </Link>
            <span className="hidden h-5 w-px bg-zinc-200 sm:block" aria-hidden="true" />
            <Link
              href={DOCS_ROUTES.root}
              className="hidden text-sm font-medium text-zinc-600 transition hover:text-zinc-900 sm:inline"
            >
              Documentation
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={AUTH_ROUTES.login}
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              Log in
            </Link>
            <Link
              href={APP_ROUTES.home}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-800"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-200 bg-white lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <DocsSidebar activeSlug={activeSlug} />
        </aside>
        <main className="min-w-0 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
