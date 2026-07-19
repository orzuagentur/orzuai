"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  Loader2Icon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteSiteDocumentAction,
  saveSiteDocumentAction,
} from "@/features/site-content/actions";
import { SITE_CONTENT_CATALOG } from "@/features/site-content/catalog";
import type { SiteDocumentRecord } from "@/features/site-content/types";
import { cn } from "@/lib/utils";

type SiteDocumentEditorProps = {
  document: SiteDocumentRecord;
  publicSiteOrigin: string;
};

type FaqItem = { question: string; answer: string };
type ArchNode = { id: string; label: string; caption: string; detail: string };
type EnterprisePillar = {
  id: string;
  title: string;
  description: string;
  metric: string;
  detail: string;
  icon: string;
};
type DocsSection = { heading: string; body: string; bulletsText: string };

function getEditorKind(doc: SiteDocumentRecord) {
  return (
    SITE_CONTENT_CATALOG.find(
      (item) =>
        item.collection === doc.collection && item.docKey === doc.docKey,
    )?.editor ?? "prose"
  );
}

export function SiteDocumentEditor({
  document: initial,
  publicSiteOrigin,
}: SiteDocumentEditorProps) {
  const [doc, setDoc] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const editorKind = getEditorKind(doc);

  const previewHref = useMemo(() => {
    if (doc.collection === "docs") {
      return `${publicSiteOrigin}/docs/${doc.docKey}`;
    }
    if (doc.collection === "faq") {
      return `${publicSiteOrigin}/#faq`;
    }
    if (doc.docKey === "architecture") {
      return `${publicSiteOrigin}/#architecture`;
    }
    if (doc.docKey === "enterprise") {
      return `${publicSiteOrigin}/#enterprise`;
    }
    if (doc.docKey === "pricing") {
      return `${publicSiteOrigin}/#pricing`;
    }
    return publicSiteOrigin;
  }, [doc, publicSiteOrigin]);

  const faqItems = (doc.payload.items as FaqItem[] | undefined) ?? [];
  const nodes = (doc.payload.nodes as ArchNode[] | undefined) ?? [];
  const pillars =
    (doc.payload.pillars as EnterprisePillar[] | undefined) ?? [];
  const checklist = (doc.payload.checklist as string[] | undefined) ?? [];
  const docSections =
    (doc.payload.sections as DocsSection[] | undefined) ?? [];

  function patchPayload(patch: Record<string, unknown>) {
    setDoc((current) => ({
      ...current,
      payload: { ...current.payload, ...patch },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveSiteDocumentAction({
        id: doc.id,
        collection: doc.collection,
        docKey: doc.docKey,
        locale: doc.locale,
        title: doc.title,
        summary: doc.summary,
        body: doc.body,
        payload: doc.payload,
        sortOrder: doc.sortOrder,
        published: doc.published,
      });

      if (result.error || !result.document) {
        toast.error(result.error ?? "Save failed");
        return;
      }

      setDoc(result.document);
      toast.success("Saved — live site will use this content when published");
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this document? The site will fall back to built-in defaults.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSiteDocumentAction(doc.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      window.location.href = "/content";
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/content"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            All content
          </Link>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <p className="truncate text-sm font-semibold">{doc.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-lg border px-3 py-1.5 text-sm sm:inline"
          >
            Preview
          </a>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            Save
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document title (admin + page heading)
            </span>
            <input
              value={doc.title}
              onChange={(event) =>
                setDoc((current) => ({ ...current, title: event.target.value }))
              }
              className="mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-3xl font-semibold outline-none focus:border-primary"
            />
          </label>

          <label className="mt-8 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Summary / subtitle
            </span>
            <textarea
              value={doc.summary}
              onChange={(event) =>
                setDoc((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              rows={3}
              className="mt-2 w-full resize-y rounded-none border-0 bg-transparent text-base leading-7 text-muted-foreground outline-none focus:ring-0"
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-y py-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={doc.published}
                onChange={(event) =>
                  setDoc((current) => ({
                    ...current,
                    published: event.target.checked,
                  }))
                }
              />
              Published on website
            </label>
            <span className="text-muted-foreground">
              {doc.collection}/{doc.docKey} · {doc.locale.toUpperCase()}
            </span>
          </div>

          <label className="mt-10 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Main text (full page — write like a document)
            </span>
            <textarea
              value={doc.body}
              onChange={(event) =>
                setDoc((current) => ({ ...current, body: event.target.value }))
              }
              rows={18}
              className="mt-3 w-full resize-y rounded-none border-0 bg-transparent text-[17px] leading-8 outline-none"
              placeholder="Write freely. This is the main readable body visitors and operators will see."
            />
          </label>

          {editorKind === "faq" ? (
            <div className="mt-12 space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">FAQ items</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() =>
                    patchPayload({
                      items: [
                        ...faqItems,
                        { question: "New question", answer: "" },
                      ],
                    })
                  }
                >
                  Add question
                </button>
              </div>
              {faqItems.map((item, index) => (
                <div key={index} className="space-y-4 border-t pt-8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Question {index + 1}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() =>
                        patchPayload({
                          items: faqItems.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={item.question}
                    onChange={(event) => {
                      const next = [...faqItems];
                      next[index] = { ...item, question: event.target.value };
                      patchPayload({ items: next });
                    }}
                    className="w-full border-0 border-b bg-transparent pb-2 text-xl font-semibold outline-none"
                  />
                  <textarea
                    value={item.answer}
                    onChange={(event) => {
                      const next = [...faqItems];
                      next[index] = { ...item, answer: event.target.value };
                      patchPayload({ items: next });
                    }}
                    rows={8}
                    className="w-full resize-y border-0 bg-transparent text-base leading-8 outline-none"
                    placeholder="Answer…"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {editorKind === "architecture" ? (
            <div className="mt-12 space-y-10">
              <Field
                label="Eyebrow"
                value={String(doc.payload.eyebrow ?? "")}
                onChange={(value) => patchPayload({ eyebrow: value })}
              />
              <Field
                label="Lead paragraph"
                value={String(doc.payload.lead ?? "")}
                onChange={(value) => patchPayload({ lead: value })}
                multiline
              />
              <Field
                label="Outcome title"
                value={String(doc.payload.outcomeTitle ?? "")}
                onChange={(value) => patchPayload({ outcomeTitle: value })}
              />
              <Field
                label="Outcome body"
                value={String(doc.payload.outcomeBody ?? "")}
                onChange={(value) => patchPayload({ outcomeBody: value })}
                multiline
              />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Pipeline stages</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() =>
                    patchPayload({
                      nodes: [
                        ...nodes,
                        {
                          id: `stage-${nodes.length + 1}`,
                          label: "New stage",
                          caption: "",
                          detail: "",
                        },
                      ],
                    })
                  }
                >
                  Add stage
                </button>
              </div>
              {nodes.map((node, index) => (
                <div key={node.id + index} className="space-y-3 border-t pt-8">
                  <input
                    value={node.label}
                    onChange={(event) => {
                      const next = [...nodes];
                      next[index] = { ...node, label: event.target.value };
                      patchPayload({ nodes: next });
                    }}
                    className="w-full border-0 border-b bg-transparent pb-2 text-xl font-semibold outline-none"
                  />
                  <input
                    value={node.caption}
                    onChange={(event) => {
                      const next = [...nodes];
                      next[index] = { ...node, caption: event.target.value };
                      patchPayload({ nodes: next });
                    }}
                    className="w-full border-0 bg-transparent text-sm text-muted-foreground outline-none"
                    placeholder="Caption"
                  />
                  <textarea
                    value={node.detail}
                    onChange={(event) => {
                      const next = [...nodes];
                      next[index] = { ...node, detail: event.target.value };
                      patchPayload({ nodes: next });
                    }}
                    rows={6}
                    className="w-full resize-y border-0 bg-transparent text-base leading-8 outline-none"
                    placeholder="Detail…"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {editorKind === "enterprise" ? (
            <div className="mt-12 space-y-10">
              <Field
                label="Eyebrow"
                value={String(doc.payload.eyebrow ?? "")}
                onChange={(value) => patchPayload({ eyebrow: value })}
              />
              <Field
                label="Honest scope note"
                value={String(doc.payload.honestyNote ?? "")}
                onChange={(value) => patchPayload({ honestyNote: value })}
                multiline
              />
              <Field
                label="Checklist title"
                value={String(doc.payload.checklistTitle ?? "")}
                onChange={(value) => patchPayload({ checklistTitle: value })}
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Checklist (one item per line)
                </span>
                <textarea
                  value={checklist.join("\n")}
                  onChange={(event) =>
                    patchPayload({
                      checklist: event.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={8}
                  className="mt-2 w-full resize-y border-0 bg-transparent text-base leading-8 outline-none"
                />
              </label>
              <h2 className="text-lg font-semibold">Pillars</h2>
              {pillars.map((pillar, index) => (
                <div key={pillar.id + index} className="space-y-3 border-t pt-8">
                  <input
                    value={pillar.title}
                    onChange={(event) => {
                      const next = [...pillars];
                      next[index] = { ...pillar, title: event.target.value };
                      patchPayload({ pillars: next });
                    }}
                    className="w-full border-0 border-b bg-transparent pb-2 text-xl font-semibold outline-none"
                  />
                  <textarea
                    value={pillar.description}
                    onChange={(event) => {
                      const next = [...pillars];
                      next[index] = {
                        ...pillar,
                        description: event.target.value,
                      };
                      patchPayload({ pillars: next });
                    }}
                    rows={6}
                    className="w-full resize-y border-0 bg-transparent text-base leading-8 outline-none"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {editorKind === "docs" ? (
            <div className="mt-12 space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Documentation sections</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() =>
                    patchPayload({
                      sections: [
                        ...docSections,
                        { heading: "New section", body: "", bulletsText: "" },
                      ],
                    })
                  }
                >
                  Add section
                </button>
              </div>
              {docSections.map((section, index) => (
                <div key={index} className="space-y-4 border-t pt-8">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Section {index + 1}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() =>
                        patchPayload({
                          sections: docSections.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={section.heading}
                    onChange={(event) => {
                      const next = [...docSections];
                      next[index] = {
                        ...section,
                        heading: event.target.value,
                      };
                      patchPayload({ sections: next });
                    }}
                    className="w-full border-0 border-b bg-transparent pb-2 text-2xl font-semibold outline-none"
                  />
                  <textarea
                    value={section.body}
                    onChange={(event) => {
                      const next = [...docSections];
                      next[index] = { ...section, body: event.target.value };
                      patchPayload({ sections: next });
                    }}
                    rows={12}
                    className="w-full resize-y border-0 bg-transparent text-[17px] leading-8 outline-none"
                    placeholder="Section body…"
                  />
                  <textarea
                    value={section.bulletsText ?? ""}
                    onChange={(event) => {
                      const next = [...docSections];
                      next[index] = {
                        ...section,
                        bulletsText: event.target.value,
                      };
                      patchPayload({ sections: next });
                    }}
                    rows={5}
                    className="w-full resize-y border-0 bg-transparent text-sm leading-7 text-muted-foreground outline-none"
                    placeholder="Bullets (one per line, optional)"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <p
            className={cn(
              "mt-16 border-t pt-6 text-xs text-muted-foreground",
            )}
          >
            Tip: Tariff prices and feature lists are edited in Billing → Tariffs
            and appear on the welcome Pricing section automatically. This
            document only controls Pricing labels (title, subtitle, CTA text).
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          className="mt-2 w-full resize-y border-0 bg-transparent text-base leading-8 outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full border-0 border-b bg-transparent pb-2 text-lg outline-none"
        />
      )}
    </label>
  );
}
