import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteChrome, SiteFooter } from "@/components/SiteChrome";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}` },
  };
}

const CREATE_KEYS = [
  { key: "aiVideo", href: "/features/ai-video", icon: "AI" },
  { key: "shorts", href: "/features/ai-youtube-shorts", icon: "YT" },
  { key: "clipping", href: "/features/ai-clipping", icon: "CL" },
  { key: "presentation", href: "/features/ai-presentation", icon: "PR" },
] as const;

const EDIT_KEYS = [
  { key: "videoEditor", href: "/features/video-editor", icon: "VE" },
  { key: "photoEditor", href: "/features/photo-editor", icon: "PE" },
] as const;

const ASSET_KEYS = [
  { key: "models3d", href: "/features/3d-models", icon: "3D" },
  { key: "hdris", href: "/features/hdris", icon: "HD" },
  { key: "textures", href: "/features/textures", icon: "TX" },
  { key: "emojis", href: "/features/emojis", icon: "EM" },
  { key: "icons", href: "/features/icons", icon: "IC" },
  { key: "mediaSearch", href: "/features/video-search", icon: "MS" },
] as const;

const STAT_KEYS = ["one", "two", "three"] as const;
const WORKFLOW_KEYS = ["brief", "compose", "publish"] as const;

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md transition group-hover:translate-x-0.5 ${className}`}
    >
      -&gt;
    </span>
  );
}

function ToolCard({
  title,
  body,
  href,
  action,
  icon,
  delay,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
  icon: string;
  delay: number;
}) {
  return (
    <li className="landing-feature" style={{ animationDelay: `${delay}s` }}>
      <Link
        href={href}
        className="group flex h-full flex-col rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-5 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:rgba(var(--accent-rgb),0.42)] hover:shadow-[var(--shadow-lift)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
      >
        <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent-soft)] font-[family-name:var(--font-syne)] text-sm font-bold text-[color:var(--accent)]">
          {icon}
        </span>
        <p
          className="font-[family-name:var(--font-syne)] text-base tracking-tight text-[color:var(--fg)] group-hover:text-[color:var(--accent)]"
          style={{ fontWeight: 750 }}
        >
          {title}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--muted)]">
          {body}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]">
          {action}
          <ArrowIcon />
        </span>
      </Link>
    </li>
  );
}

function HeroPreview({
  labels,
}: {
  labels: {
    title: string;
    status: string;
    channel: string;
    video: string;
    scoreLabel: string;
    score: string;
    renderLabel: string;
    renderValue: string;
    subtitlesLabel: string;
    subtitlesValue: string;
    queueTitle: string;
    script: string;
    voice: string;
    captions: string;
  };
}) {
  const rows = [
    labels.script,
    labels.voice,
    labels.captions,
  ];

  return (
    <div className="landing-rise-delay relative mx-auto w-full max-w-[36rem] lg:mx-0">
      <div className="overflow-hidden rounded-[18px] border border-[color:var(--line-strong)] bg-[#111827] p-2 shadow-[0_24px_70px_rgba(17,24,39,0.22)]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-white/70">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#fb7185]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
            OrzuAi Studio
          </span>
        </div>

        <div className="grid gap-3 bg-[#f8fafc] p-3 sm:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">{labels.title}</p>
            <div className="mt-4 space-y-2">
              {rows.map((row, index) => (
                <div
                  key={row}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      index === 2 ? "bg-[color:var(--accent-warm)]" : "bg-[color:var(--accent)]"
                    }`}
                  />
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-700">
                    {row}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-[color:var(--accent-soft)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">
                {labels.status}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full w-[92%] rounded-full bg-[color:var(--accent)]" />
              </div>
            </div>
          </aside>

          <main className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  {labels.channel}
                </p>
                <h2 className="mt-1 truncate font-[family-name:var(--font-syne)] text-base font-bold tracking-tight text-slate-950">
                  {labels.video}
                </h2>
              </div>
              <span className="shrink-0 rounded-md bg-[#111827] px-2 py-1 text-[11px] font-semibold text-white">
                9:16
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-[linear-gradient(160deg,#111827_0%,#0f766e_52%,#f9735d_100%)]">
                <div className="absolute inset-3 rounded-md border border-white/15 bg-white/10 backdrop-blur-[1px]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-mark.png"
                  alt=""
                  className="absolute left-1/2 top-[32%] h-16 w-16 -translate-x-1/2 object-contain opacity-90"
                  draggable={false}
                />
                <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/55 px-2 py-2 text-center text-[10px] font-semibold leading-tight text-white">
                  {labels.video}
                </div>
              </div>

              <div className="grid content-between gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">
                      {labels.scoreLabel}
                    </p>
                    <p className="font-[family-name:var(--font-syne)] text-2xl font-bold text-[color:var(--accent)]">
                      {labels.score}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-slate-500">{labels.renderLabel}</p>
                      <p className="mt-1 font-bold text-slate-950">
                        {labels.renderValue}
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-slate-500">{labels.subtitlesLabel}</p>
                      <p className="mt-1 font-bold text-slate-950">
                        {labels.subtitlesValue}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {labels.queueTitle}
                  </p>
                  <div className="mt-3 space-y-2">
                    {[78, 64, 46].map((width, index) => (
                      <div
                        key={width}
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                      >
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)]"
                          style={{
                            width: `${width}%`,
                            opacity: 1 - index * 0.18,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const previewLabels = {
    title: t("previewTitle"),
    status: t("previewStatus"),
    channel: t("previewChannel"),
    video: t("previewVideoTitle"),
    scoreLabel: t("previewScoreLabel"),
    score: t("previewScore"),
    renderLabel: t("previewRender"),
    renderValue: t("previewRenderValue"),
    subtitlesLabel: t("previewSubtitles"),
    subtitlesValue: t("previewSubtitlesValue"),
    queueTitle: t("previewQueueTitle"),
    script: t("previewTaskScript"),
    voice: t("previewTaskVoice"),
    captions: t("previewTaskCaptions"),
  };

  const groups = [
    {
      title: t("createTitle"),
      body: t("createBody"),
      items: CREATE_KEYS,
    },
    {
      title: t("editTitle"),
      body: t("editBody"),
      items: EDIT_KEYS,
    },
    {
      title: t("assetsTitle"),
      body: t("assetsBody"),
      items: ASSET_KEYS,
    },
  ];

  return (
    <SiteChrome bare>
      <section className="relative isolate overflow-hidden border-b border-[color:var(--line)] bg-[color:var(--bg)]">
        <div className="pointer-events-none absolute inset-0 -z-10 landing-grid" aria-hidden />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-14 lg:pt-14">
          <div className="landing-rise max-w-2xl">
            <p className="inline-flex rounded-md border border-[color:rgba(var(--accent-rgb),0.18)] bg-[color:var(--accent-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">
              {t("eyebrow")}
            </p>
            <h1
              className="mt-5 font-[family-name:var(--font-syne)] text-[2.25rem] leading-[1.03] tracking-tight text-[color:var(--fg)] sm:text-5xl lg:text-[3.55rem]"
              style={{ fontWeight: 800 }}
            >
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">
              {t("subhead")}
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="group btn btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-lg px-6 text-base sm:w-auto sm:px-7 sm:whitespace-nowrap"
              >
                {t("ctaStart")}
                <ArrowIcon className="bg-white/15" />
              </Link>
              <Link
                href="/features"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-6 text-base font-semibold text-[color:var(--fg)] shadow-[var(--shadow-card)] transition hover:border-[color:rgba(var(--accent-rgb),0.35)] hover:bg-white active:scale-[0.99] sm:w-auto sm:px-7 sm:whitespace-nowrap"
              >
                {t("ctaTools")}
                <ArrowIcon className="bg-[color:var(--overlay-soft)]" />
              </Link>
            </div>

            <p className="mt-5 max-w-lg text-sm leading-6 text-[color:var(--muted)]">
              {t("heroFootnote")}
            </p>
          </div>

          <HeroPreview labels={previewLabels} />
        </div>
      </section>

      <section className="border-b border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 py-6 sm:px-8">
        <dl className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {STAT_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-4"
            >
              <dt className="text-sm leading-6 text-[color:var(--muted)]">
                {t(`stats.${key}.label`)}
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight text-[color:var(--fg)]">
                {t(`stats.${key}.value`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-4 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">
              {t("workflowEyebrow")}
            </p>
            <h2
              className="mt-3 font-[family-name:var(--font-syne)] text-3xl tracking-tight text-[color:var(--fg)] sm:text-4xl"
              style={{ fontWeight: 800 }}
            >
              {t("workflowTitle")}
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
              {t("workflowBody")}
            </p>
          </div>

          <ol className="mt-9 grid gap-4 md:grid-cols-3">
            {WORKFLOW_KEYS.map((key, index) => (
              <li
                key={key}
                className="relative rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-5 shadow-[var(--shadow-card)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--fg)] font-[family-name:var(--font-syne)] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight">
                  {t(`workflow.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {t(`workflow.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="tools"
        className="border-y border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--accent)]">
                {t("toolsEyebrow")}
              </p>
              <h2
                className="mt-3 font-[family-name:var(--font-syne)] text-3xl tracking-tight text-[color:var(--fg)] sm:text-4xl"
                style={{ fontWeight: 800 }}
              >
                {t("toolsTitle")}
              </h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                {t("toolsBody")}
              </p>
            </div>

            <div className="space-y-9">
              {groups.map((group, groupIndex) => (
                <div key={group.title}>
                  <div className="flex flex-col gap-2 border-b border-[color:var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold tracking-tight">
                        {group.title}
                      </h3>
                      <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
                        {group.body}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {group.items.map((item, itemIndex) => (
                      <ToolCard
                        key={item.key}
                        title={t(`cards.${item.key}.title`)}
                        body={t(`cards.${item.key}.body`)}
                        href={item.href}
                        action={t("cardAction")}
                        icon={item.icon}
                        delay={0.03 + groupIndex * 0.05 + itemIndex * 0.035}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-lg border border-[color:var(--line)] bg-[linear-gradient(135deg,#111827_0%,#0f766e_100%)] p-6 text-white shadow-[var(--shadow-lift)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl">
              {t("finalTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              {t("finalBody")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex min-h-12 min-w-[12rem] items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-white/90 sm:whitespace-nowrap"
              style={{ color: "#111827" }}
            >
              {t("ctaAccount")}
              <ArrowIcon className="bg-black/5" />
            </Link>
            <Link
              href="/features"
              className="group inline-flex min-h-12 min-w-[12rem] items-center justify-center gap-2 rounded-lg border border-white/20 px-6 text-sm font-bold text-white transition hover:bg-white/10 sm:whitespace-nowrap"
            >
              {t("ctaBrowse")}
              <ArrowIcon className="bg-white/10" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </SiteChrome>
  );
}
