import Link from "next/link";
import { SiteChrome, SiteFooter } from "@/components/SiteChrome";
import { BrandLogoWide } from "@/components/BrandLogo";

export const metadata = {
  title: "OrzuAi — AI Creator Studio",
  description:
    "OrzuAi AI creator studio: AI Video, Shorts, clipping, presentations, video & photo editors, 3D models, HDRIs, textures, emojis, icons, and media search.",
  keywords: [
    "OrzuAi",
    "AI creator studio",
    "AI video",
    "video editor",
    "photo editor",
    "3D models",
    "HDRI",
    "textures",
    "emojis",
    "icons",
  ],
  alternates: { canonical: "/" },
};

const CREATE = [
  {
    title: "AI Video",
    body: "Prompt → script, voice, captions, montage.",
    href: "/features/ai-video",
  },
  {
    title: "YouTube Shorts",
    body: "Train once, generate and schedule Shorts.",
    href: "/features/ai-youtube-shorts",
  },
  {
    title: "AI Clipping",
    body: "Long footage → viral vertical clips.",
    href: "/features/ai-clipping",
  },
  {
    title: "AI Presentation",
    body: "Decks with AI and creator assets.",
    href: "/features/ai-presentation",
  },
] as const;

const EDIT = [
  {
    title: "Video editor",
    body: "Filters, captions, music, transitions.",
    href: "/features/video-editor",
  },
  {
    title: "Photo editor",
    body: "Layers, text, and design tools.",
    href: "/features/photo-editor",
  },
] as const;

const ASSETS = [
  {
    title: "3D models",
    body: "Free CC0 models for creators.",
    href: "/features/3d-models",
  },
  {
    title: "HDRIs",
    body: "Environment maps for lighting.",
    href: "/features/hdris",
  },
  {
    title: "Textures",
    body: "PBR materials library.",
    href: "/features/textures",
  },
  {
    title: "Emojis",
    body: "For explainers and decks.",
    href: "/features/emojis",
  },
  {
    title: "Icons",
    body: "Iconify-backed icon browser.",
    href: "/features/icons",
  },
  {
    title: "Photo & video search",
    body: "Stock media for B-roll and design.",
    href: "/features/video-search",
  },
] as const;

function ToolCard({
  title,
  body,
  href,
  delay,
}: {
  title: string;
  body: string;
  href: string;
  delay: number;
}) {
  return (
    <li className="landing-feature" style={{ animationDelay: `${delay}s` }}>
      <Link
        href={href}
        className="group flex h-full flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-4 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:rgba(196,125,34,0.42)] sm:p-5"
      >
        <p
          className="font-[family-name:var(--font-syne)] text-[0.95rem] tracking-tight group-hover:text-[color:var(--accent)] sm:text-base"
          style={{ fontWeight: 700 }}
        >
          {title}
        </p>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[color:var(--muted)]">
          {body}
        </p>
        <span className="mt-3 text-xs font-semibold text-[color:var(--accent)] opacity-80 transition group-hover:opacity-100">
          Learn more →
        </span>
      </Link>
    </li>
  );
}

export default function HomePage() {
  return (
    <SiteChrome bare>
      <section className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div
            className="landing-glow absolute -right-24 top-8 h-80 w-80 rounded-full blur-3xl sm:h-[28rem] sm:w-[28rem]"
            style={{ background: "rgba(196,125,34,0.11)" }}
          />
          <div
            className="absolute -left-20 bottom-10 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "rgba(100,130,190,0.09)" }}
          />
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(196,125,34,0.35), transparent)",
            }}
          />
        </div>

        <div className="mx-auto flex min-h-[min(88svh,720px)] max-w-5xl flex-col justify-center px-4 pb-12 pt-8 sm:px-8 sm:pb-14 sm:pt-10">
          <div className="landing-rise max-w-2xl">
            <BrandLogoWide
              width={188}
              className="max-w-[min(70vw,220px)] w-full sm:max-w-[250px]"
            />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              AI creator studio
            </p>
            <h1
              className="mt-3 font-[family-name:var(--font-syne)] text-[1.7rem] leading-[1.12] tracking-tight text-[color:var(--fg)] sm:mt-4 sm:text-4xl sm:leading-[1.08] md:text-[2.55rem]"
              style={{ fontWeight: 800 }}
            >
              Create, edit, and publish — one clear studio.
            </h1>
            <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-[color:var(--muted)] sm:mt-5 sm:text-lg">
              AI Video, Shorts, clipping, presentations, video &amp; photo
              editors, plus 3D, HDRIs, textures, emojis, and icons.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="landing-cta btn btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-full px-7 text-base sm:w-auto sm:min-h-[3.15rem] sm:px-8"
                style={{ boxShadow: "0 12px 28px rgba(196,125,34,0.25)" }}
              >
                Start free
              </Link>
              <Link
                href="/features"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-7 text-base font-semibold text-[color:var(--fg)] shadow-[var(--shadow-card)] transition hover:border-[color:rgba(196,125,34,0.35)] active:scale-[0.98] sm:w-auto sm:min-h-[3.15rem] sm:px-8"
              >
                All tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 py-11 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="landing-rise-delay">
            <h2
              className="font-[family-name:var(--font-syne)] text-2xl tracking-tight sm:text-[1.75rem]"
              style={{ fontWeight: 800 }}
            >
              Create with AI
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)] sm:text-[0.95rem]">
              From prompt to published Short — without switching apps.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CREATE.map((item, i) => (
                <ToolCard key={item.title} {...item} delay={0.05 + i * 0.05} />
              ))}
            </ul>
          </div>

          <div>
            <h2
              className="font-[family-name:var(--font-syne)] text-xl tracking-tight sm:text-2xl"
              style={{ fontWeight: 800 }}
            >
              Edit
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
              Pro tools when you want full control.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {EDIT.map((item, i) => (
                <ToolCard key={item.title} {...item} delay={0.04 + i * 0.05} />
              ))}
            </ul>
          </div>

          <div>
            <h2
              className="font-[family-name:var(--font-syne)] text-xl tracking-tight sm:text-2xl"
              style={{ fontWeight: 800 }}
            >
              Libraries &amp; assets
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
              3D, lighting, textures, icons, emojis, and stock media.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ASSETS.map((item, i) => (
                <ToolCard key={item.title} {...item} delay={0.03 + i * 0.04} />
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 border-t border-[color:var(--line)] pt-8 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/signup"
              className="btn btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm sm:min-h-12 sm:px-7 sm:text-base"
            >
              Create account
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[color:var(--fg)] sm:text-base"
            >
              Browse every feature →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </SiteChrome>
  );
}
