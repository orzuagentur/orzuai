import Link from "next/link";

import { DOCS_NAV, DOCS_ROUTES } from "@/features/docs/nav";
import { DOCS_OVERVIEW } from "@/features/docs/content";
import { AUTH_ROUTES } from "@/constants/routes";

export function DocsOverview() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {DOCS_OVERVIEW.updatedLabel}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        {DOCS_OVERVIEW.title}
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-600">{DOCS_OVERVIEW.summary}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={DOCS_ROUTES.page("getting-started")}
          className="inline-flex h-10 items-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Start here
        </Link>
        <Link
          href={DOCS_ROUTES.page("about")}
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          About OrzuX
        </Link>
        <Link
          href={AUTH_ROUTES.register}
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          Create account
        </Link>
      </div>

      <div className="mt-12 space-y-10">
        {DOCS_NAV.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {group.title}
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={DOCS_ROUTES.page(item.slug)}
                    className="block h-full rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:shadow-sm"
                  >
                    <span className="block text-sm font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      {item.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
