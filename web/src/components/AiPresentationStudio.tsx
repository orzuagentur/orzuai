"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ToastNotice";
import { CardMenu } from "@/components/CardMenu";
import { buildPresentationFromAiPlan } from "@/lib/presentation/ai-build";
import {
  deletePresentationLibraryItem,
  emptyPresentationInfo,
  fetchPresentationLibrary,
  fetchPresentationLibraryItem,
  savePresentationDocToLibrary,
  type PresentationExportFormat,
  type PresentationInfoFields,
  type PresentationLibraryItem,
} from "@/lib/presentation/library";
import {
  downloadPresentationWord,
  printPresentationPdf,
} from "@/lib/presentation/export";
import { savePresentationDraft } from "@/lib/presentation/factory";

const FORMATS = [
  { id: "pdf" as const, labelKey: "pdf" as const, hintKey: "printReady" as const },
  { id: "word" as const, labelKey: "word" as const, hintKey: "docForWord" as const },
];

const PAGE_COUNTS = [
  { id: "auto", label: "Auto" },
  { id: "6", label: "6" },
  { id: "8", label: "8" },
  { id: "10", label: "10" },
  { id: "12", label: "12" },
] as const;

function PromptChip({
  label,
  value,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  value: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition"
        style={{
          borderColor: open ? "rgba(232,165,75,0.55)" : "var(--line)",
          background: open ? "rgba(232,165,75,0.14)" : "rgba(255,255,255,0.03)",
          color: open ? "var(--accent)" : "var(--fg)",
        }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
          {label}
        </span>
        <span>{value}</span>
        <span className="text-[10px] text-[color:var(--muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[150px] overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1.5 shadow-xl"
          role="listbox"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AiPresentationStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("studio.aiPresentation");
  const tPres = useTranslations("studio.presentation");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const tab = searchParams.get("tab") === "library" ? "library" : "create";
  const { show: toast, notice } = useToast();

  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<PresentationExportFormat>("pdf");
  const [pagesId, setPagesId] =
    useState<(typeof PAGE_COUNTS)[number]["id"]>("auto");
  const [info, setInfo] = useState<PresentationInfoFields>(emptyPresentationInfo);
  const [openChip, setOpenChip] = useState<"format" | "pages" | null>(null);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<PresentationLibraryItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      setItems(await fetchPresentationLibrary());
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, tab]);

  const formatLabel = FORMATS.find((f) => f.id === format)
    ? tPres(FORMATS.find((f) => f.id === format)!.labelKey)
    : tPres("pdf");
  const pagesLabel =
    pagesId === "auto"
      ? tc("auto")
      : PAGE_COUNTS.find((p) => p.id === pagesId)?.label || tc("auto");

  const libraryEmpty = useMemo(() => items.length === 0, [items.length]);

  function patchInfo(key: keyof PresentationInfoFields, value: string) {
    setInfo((prev) => ({ ...prev, [key]: value }));
  }

  async function createPresentation() {
    const text = prompt.trim();
    if (text.length < 8 || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          format,
          slide_count: pagesId === "auto" ? "auto" : Number(pagesId),
          info,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const doc = await buildPresentationFromAiPlan(data.plan || {}, info);
      const saved = savePresentationDocToLibrary(doc, {
        format,
        source: "ai",
        info,
        title: doc.title,
      });
      savePresentationDraft(saved.doc);
      refresh();
      toast(t("ready"));
      router.push(`/dashboard/creators/presentation?id=${saved.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create presentation");
    } finally {
      setCreating(false);
    }
  }

  async function openItem(item: PresentationLibraryItem) {
    const full = (await fetchPresentationLibraryItem(item.id)) || item;
    savePresentationDraft(full.doc);
    router.push(
      `/dashboard/creators/presentation?id=${encodeURIComponent(full.id)}`,
    );
  }

  async function exportItem(
    item: PresentationLibraryItem,
    kind: PresentationExportFormat,
  ) {
    setBusyId(item.id);
    try {
      const full = (await fetchPresentationLibraryItem(item.id)) || item;
      savePresentationDraft(full.doc);
      if (kind === "word") {
        await downloadPresentationWord(full.doc);
        toast(t("wordDownloaded"));
      } else {
        // Open editor print surface for PDF (same as classic export)
        router.push(
          `/dashboard/creators/presentation?id=${full.id}&export=pdf`,
        );
        toast("Opening print / PDF view…");
        window.setTimeout(() => printPresentationPdf(), 700);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    await deletePresentationLibraryItem(id);
    refresh();
    toast("Presentation deleted.");
  }

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 pb-28">
      {notice}
      <header className="rise">
        <h1
          className="font-[family-name:var(--font-syne)] text-3xl tracking-tight sm:text-4xl"
          style={{ fontWeight: 800 }}
        >
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Prompt → slides → open on OrzuAi, export PDF or Word.
        </p>
      </header>

      {tab === "create" && (
        <section className="rise-delay space-y-4">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] focus-within:border-[color:rgba(232,165,75,0.45)]">
            <textarea
              className="min-h-[160px] w-full resize-y border-0 bg-transparent px-4 pt-4 pb-2 text-base leading-relaxed outline-none placeholder:text-[color:var(--muted)]"
              placeholder={t("placeholder")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={creating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void createPresentation();
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--line)] px-3 py-2.5">
              <PromptChip
                label="Format"
                value={formatLabel}
                open={openChip === "format"}
                onOpenChange={(open) => setOpenChip(open ? "format" : null)}
              >
                {FORMATS.map((f) => {
                  const on = format === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className="flex w-full items-center justify-between gap-4 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/5"
                      style={{ color: on ? "var(--accent)" : "var(--fg)" }}
                      onClick={() => {
                        setFormat(f.id);
                        setOpenChip(null);
                      }}
                    >
                      <span className="font-semibold">{tPres(f.labelKey)}</span>
                      <span className="text-xs text-[color:var(--muted)]">
                        {t(f.hintKey)}
                      </span>
                    </button>
                  );
                })}
              </PromptChip>

              <PromptChip
                label="Pages"
                value={pagesLabel}
                open={openChip === "pages"}
                onOpenChange={(open) => setOpenChip(open ? "pages" : null)}
              >
                {PAGE_COUNTS.map((p) => {
                  const on = pagesId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/5"
                      style={{ color: on ? "var(--accent)" : "var(--fg)" }}
                      onClick={() => {
                        setPagesId(p.id);
                        setOpenChip(null);
                      }}
                    >
                      <span className="font-semibold">
                        {p.id === "auto" ? tc("auto") : p.label}
                      </span>
                      {p.id === "auto" && (
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {tc("aiPicks")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </PromptChip>

              <div className="ml-auto">
                <button
                  type="button"
                  className="btn btn-primary px-5 text-sm"
                  disabled={creating || prompt.trim().length < 8}
                  onClick={() => void createPresentation()}
                >
                  {creating ? t("designing") : t("generate")}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--fg)]">
              {t("permissions")}
            </h2>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Optional fields — AI uses them on slides and QR / contact page.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-[color:var(--muted)]">
                Author
                <input
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[rgba(232,165,75,0.45)]"
                  value={info.author}
                  onChange={(e) => patchInfo("author", e.target.value)}
                  placeholder={t("yourName")}
                  disabled={creating}
                />
              </label>
              <label className="block text-xs text-[color:var(--muted)]">
                {t("companyBrand")}
                <input
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[rgba(232,165,75,0.45)]"
                  value={info.company}
                  onChange={(e) => patchInfo("company", e.target.value)}
                  placeholder="OrzuAi"
                  disabled={creating}
                />
              </label>
              <label className="block text-xs text-[color:var(--muted)] sm:col-span-2">
                {t("websiteQr")}
                <input
                  className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[rgba(232,165,75,0.45)]"
                  value={info.website}
                  onChange={(e) => patchInfo("website", e.target.value)}
                  placeholder="https://…"
                  disabled={creating}
                />
              </label>
              <label className="block text-xs text-[color:var(--muted)] sm:col-span-2">
                {t("permissions")}
                <textarea
                  className="mt-1 min-h-[72px] w-full resize-y rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[rgba(232,165,75,0.45)]"
                  value={info.permissions}
                  onChange={(e) => patchInfo("permissions", e.target.value)}
                  placeholder={t("internalOnly")}
                  disabled={creating}
                />
              </label>
              <label className="block text-xs text-[color:var(--muted)] sm:col-span-2">
                Extra notes
                <textarea
                  className="mt-1 min-h-[64px] w-full resize-y rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[rgba(232,165,75,0.45)]"
                  value={info.notes}
                  onChange={(e) => patchInfo("notes", e.target.value)}
                  placeholder={t("audienceHint")}
                  disabled={creating}
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {tab === "library" && (
        <section className="rise-delay space-y-4">
          {libraryEmpty ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--line)] p-10 text-center text-sm text-[color:var(--muted)]">
              {t("noPresentations")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-4 transition hover:border-[rgba(232,165,75,0.4)]"
                >
                  <div className="absolute right-2 top-2 z-10">
                    <CardMenu
                      items={[
                        {
                          label: t("openPlatform"),
                          onClick: () => void openItem(item),
                        },
                        {
                          label: t("exportPdf"),
                          onClick: () => void exportItem(item, "pdf"),
                          disabled: busyId === item.id,
                        },
                        {
                          label: t("exportWord"),
                          onClick: () => void exportItem(item, "word"),
                          disabled: busyId === item.id,
                        },
                        {
                          label: tCommon("delete"),
                          onClick: () => removeItem(item.id),
                          danger: true,
                        },
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void openItem(item)}
                  >
                    <p className="pr-8 text-base font-semibold tracking-tight text-[var(--fg)]">
                      {item.title || tc("untitled")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--muted)]">
                      <span className="uppercase tracking-wide">
                        {item.format === "word" ? tPres("word") : tPres("pdf")}
                      </span>
                      <span>·</span>
                      <span>{item.doc.slides.length} slides</span>
                      <span>·</span>
                      <span>
                        {item.source === "ai" ? "AI" : tc("classic")}
                      </span>
                      <span>·</span>
                      <span>{formatDate(item.updatedAt)}</span>
                    </div>
                    {item.info.company || item.info.author ? (
                      <p className="mt-2 truncate text-xs text-[color:var(--muted)]">
                        {[item.info.company, item.info.author]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary flex-1 px-3 py-2 text-xs"
                      onClick={() => void openItem(item)}
                    >
                      {tc("open")}
                    </button>
                    <Link
                      href={`/dashboard/creators/presentation?id=${item.id}`}
                      className="btn flex-1 px-3 py-2 text-center text-xs"
                    >
                      {tc("edit")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
