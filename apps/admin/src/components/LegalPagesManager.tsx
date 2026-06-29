"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteLegalPageAction,
  saveLegalPageAction,
} from "@/features/legal-pages/actions";
import { legalPagePath } from "@/features/legal-pages/defaults";
import type { LegalPageRecord, LegalSection } from "@/features/legal-pages/types";

type LegalPagesManagerProps = {
  initialPages: LegalPageRecord[];
  publicSiteOrigin: string;
};

type EditorState = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  footerLabel: string;
  sortOrder: number;
  published: boolean;
  showInFooter: boolean;
  sections: LegalSection[];
};

function emptySection(): LegalSection {
  return { title: "New section", paragraphs: [""] };
}

function pageToEditor(page?: LegalPageRecord): EditorState {
  if (!page) {
    return {
      slug: "",
      title: "",
      description: "",
      footerLabel: "",
      sortOrder: 100,
      published: true,
      showInFooter: true,
      sections: [emptySection()],
    };
  }

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    footerLabel: page.footerLabel,
    sortOrder: page.sortOrder,
    published: page.published,
    showInFooter: page.showInFooter,
    sections: page.sections.map((section: LegalSection) => ({
      ...section,
      paragraphs: [...section.paragraphs],
      list: section.list ? [...section.list] : undefined,
    })),
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LegalPagesManager({
  initialPages,
  publicSiteOrigin,
}: LegalPagesManagerProps) {
  const [pages, setPages] = useState(initialPages);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPages[0]?.id ?? null,
  );
  const [editor, setEditor] = useState<EditorState>(
    pageToEditor(initialPages[0]),
  );
  const [isPending, startTransition] = useTransition();

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? null,
    [pages, selectedId],
  );

  const selectPage = (page: LegalPageRecord) => {
    setSelectedId(page.id);
    setEditor(pageToEditor(page));
  };

  const startCreate = () => {
    setSelectedId(null);
    setEditor(pageToEditor());
  };

  const updateSection = (
    index: number,
    patch: Partial<LegalSection>,
  ) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveLegalPageAction(editor);

      if (!result.success || !result.page) {
        toast.error(result.message ?? "Не удалось сохранить страницу.");
        return;
      }

      setPages((current) => {
        const exists = current.some((page) => page.id === result.page!.id);
        return exists
          ? current.map((page) =>
              page.id === result.page!.id ? result.page! : page,
            )
          : [...current, result.page!].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            );
      });
      setSelectedId(result.page.id);
      setEditor(pageToEditor(result.page));
      toast.success("Страница сохранена.");
    });
  };

  const handleDelete = () => {
    if (!selectedPage) {
      return;
    }

    if (!window.confirm(`Удалить страницу «${selectedPage.title}»?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLegalPageAction({ id: selectedPage.id });

      if (!result.success) {
        toast.error(result.message ?? "Не удалось удалить страницу.");
        return;
      }

      const nextPages = pages.filter((page) => page.id !== selectedPage.id);
      setPages(nextPages);
      setSelectedId(nextPages[0]?.id ?? null);
      setEditor(pageToEditor(nextPages[0]));
      toast.success("Страница удалена.");
    });
  };

  const publicUrl =
    editor.slug.trim().length > 0
      ? `${publicSiteOrigin}${legalPagePath(editor.slug.trim())}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Legal pages</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Управление Privacy Policy, Terms, Data Deletion и другими
            публичными страницами. Ссылки в футере сайта обновляются
            автоматически.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <PlusIcon className="size-4" />
          Добавить страницу
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-xl border bg-card p-3">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => selectPage(page)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                selectedId === page.id
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <p className="text-sm font-medium">{page.title}</p>
              <p className="text-xs text-muted-foreground">/{page.slug}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {page.showInFooter ? "В футере" : "Скрыта в футере"} ·{" "}
                {page.published ? "Опубликована" : "Черновик"}
              </p>
            </button>
          ))}
        </aside>

        <div className="space-y-6 rounded-xl border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="legal-title" className="text-sm font-medium">
                Заголовок
              </label>
              <input
                id="legal-title"
                value={editor.title}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="legal-slug" className="text-sm font-medium">
                Slug (URL)
              </label>
              <input
                id="legal-slug"
                value={editor.slug}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                placeholder="cookie-policy"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="legal-footer-label" className="text-sm font-medium">
                Текст ссылки в футере
              </label>
              <input
                id="legal-footer-label"
                value={editor.footerLabel}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    footerLabel: event.target.value,
                  }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="legal-sort-order" className="text-sm font-medium">
                Порядок в футере
              </label>
              <input
                id="legal-sort-order"
                type="number"
                value={editor.sortOrder}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="legal-description" className="text-sm font-medium">
              Описание под заголовком
            </label>
            <textarea
              id="legal-description"
              value={editor.description}
              onChange={(event) =>
                setEditor((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editor.published}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    published: event.target.checked,
                  }))
                }
              />
              Опубликована
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editor.showInFooter}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    showInFooter: event.target.checked,
                  }))
                }
              />
              Показывать в футере
            </label>
          </div>

          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Открыть на сайте
              <ExternalLinkIcon className="size-3.5" />
            </a>
          ) : null}

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Разделы</h2>
              <button
                type="button"
                onClick={() =>
                  setEditor((current) => ({
                    ...current,
                    sections: [...current.sections, emptySection()],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <PlusIcon className="size-4" />
                Раздел
              </button>
            </div>

            {editor.sections.map((section, sectionIndex) => (
              <div
                key={`${section.title}-${sectionIndex}`}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">Заголовок раздела</label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((current) => ({
                        ...current,
                        sections: current.sections.filter(
                          (_, index) => index !== sectionIndex,
                        ),
                      }))
                    }
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSection(sectionIndex, { title: event.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Абзацы (один на строку)
                  </label>
                  <textarea
                    value={section.paragraphs.join("\n")}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        paragraphs: event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={4}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Список (опционально, один пункт на строку)
                  </label>
                  <textarea
                    value={(section.list ?? []).join("\n")}
                    onChange={(event) => {
                      const lines = event.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean);

                      updateSection(sectionIndex, {
                        list: lines.length > 0 ? lines : undefined,
                      });
                    }}
                    rows={4}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              Сохранить
            </button>
            {selectedPage ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2Icon className="size-4" />
                Удалить
              </button>
            ) : null}
            {selectedPage ? (
              <p className="self-center text-xs text-muted-foreground">
                Обновлено: {formatDate(selectedPage.updatedAt)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
