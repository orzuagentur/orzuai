import type { PresentationDoc } from "./types";

export type PresentationExportFormat = "pdf" | "word" | "pptx";

export type PresentationInfoFields = {
  author: string;
  company: string;
  website: string;
  permissions: string;
  notes: string;
};

export type PresentationLibraryItem = {
  id: string;
  title: string;
  format: PresentationExportFormat;
  source: "ai" | "classic";
  createdAt: string;
  updatedAt: string;
  info: PresentationInfoFields;
  doc: PresentationDoc;
  /** Present when loaded from cloud list (doc may be a stub). */
  slideCount?: number;
};

/** Lightweight list row (vault) — full `doc` may be a stub until opened. */
export type PresentationLibrarySummary = Omit<PresentationLibraryItem, "doc"> & {
  doc: PresentationDoc;
  slideCount?: number;
};

const LIBRARY_KEY = "orzuai.presentation.library.v1";
const ACTIVE_KEY = "orzuai.presentation.activeId.v1";

function emptyInfo(): PresentationInfoFields {
  return {
    author: "",
    company: "",
    website: "",
    permissions: "",
    notes: "",
  };
}

function stubDoc(item: {
  id: string;
  title: string;
  slideCount?: number;
  updatedAt?: string;
}): PresentationDoc {
  const n = Math.max(1, Number(item.slideCount) || 1);
  return {
    id: item.id,
    title: item.title,
    themeId: "midnight",
    slides: Array.from({ length: n }, (_, i) => ({
      id: `stub-${item.id}-${i}`,
      name: `Slide ${i + 1}`,
      background: "#111111",
      transition: "fade" as const,
      transitionMs: 400,
      notes: "",
      elements: [],
    })),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

export function listPresentationLibraryLocal(): PresentationLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PresentationLibraryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && item?.doc?.slides?.length)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  } catch {
    return [];
  }
}

/** @deprecated use listPresentationLibraryLocal or fetchPresentationLibrary */
export function listPresentationLibrary(): PresentationLibraryItem[] {
  return listPresentationLibraryLocal();
}

function writeLibrary(items: PresentationLibraryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, 80)));
  } catch {
    /* quota */
  }
}

export function getPresentationLibraryItem(
  id: string,
): PresentationLibraryItem | null {
  return listPresentationLibraryLocal().find((item) => item.id === id) || null;
}

export function upsertPresentationLibraryItemLocal(
  item: PresentationLibraryItem,
): PresentationLibraryItem {
  const items = listPresentationLibraryLocal().filter((x) => x.id !== item.id);
  const next = {
    ...item,
    updatedAt: new Date().toISOString(),
    info: { ...emptyInfo(), ...item.info },
  };
  writeLibrary([next, ...items]);
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_KEY, next.id);
  }
  return next;
}

/** Local cache write + fire-and-forget R2 sync. */
export function upsertPresentationLibraryItem(
  item: PresentationLibraryItem,
): PresentationLibraryItem {
  const next = upsertPresentationLibraryItemLocal(item);
  void syncPresentationToCloud(next);
  return next;
}

export function savePresentationDocToLibrary(
  doc: PresentationDoc,
  meta?: Partial<
    Pick<PresentationLibraryItem, "format" | "source" | "info" | "title">
  >,
): PresentationLibraryItem {
  const existing = getPresentationLibraryItem(doc.id);
  const item: PresentationLibraryItem = {
    id: doc.id,
    title: (meta?.title || doc.title || existing?.title || "Presentation").trim(),
    format: meta?.format || existing?.format || "pdf",
    source: meta?.source || existing?.source || "classic",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    info: {
      ...emptyInfo(),
      ...(existing?.info || {}),
      ...(meta?.info || {}),
    },
    doc: {
      ...doc,
      title: meta?.title || doc.title,
      updatedAt: new Date().toISOString(),
    },
  };
  return upsertPresentationLibraryItem(item);
}

export function deletePresentationLibraryItemLocal(id: string) {
  const items = listPresentationLibraryLocal().filter((x) => x.id !== id);
  writeLibrary(items);
  if (typeof window !== "undefined" && localStorage.getItem(ACTIVE_KEY) === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export async function deletePresentationLibraryItem(id: string) {
  deletePresentationLibraryItemLocal(id);
  try {
    await fetch(`/api/presentations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {
    /* offline / table missing */
  }
}

export function setActivePresentationId(id: string | null) {
  if (typeof window === "undefined") return;
  if (!id) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
}

export function getActivePresentationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function emptyPresentationInfo(): PresentationInfoFields {
  return emptyInfo();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSync: PresentationLibraryItem | null = null;

/** Debounced R2 + Postgres sync (avoids upload on every keystroke). */
export function syncPresentationToCloud(item: PresentationLibraryItem) {
  pendingSync = item;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const payload = pendingSync;
    pendingSync = null;
    if (!payload) return;
    void fetch("/api/presentations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* keep local cache */
    });
  }, 1500);
}

export async function flushPresentationCloudSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const payload = pendingSync;
  pendingSync = null;
  if (!payload) return;
  try {
    await fetch("/api/presentations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
}

/** Vault list: cloud first, migrate local leftovers, fall back to local. */
export async function fetchPresentationLibrary(): Promise<
  PresentationLibrarySummary[]
> {
  const local = listPresentationLibraryLocal();
  try {
    const res = await fetch("/api/presentations", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load");

    const remote = (data.items || []) as Array<{
      id: string;
      title: string;
      format: PresentationExportFormat;
      source: "ai" | "classic";
      slideCount: number;
      info: PresentationInfoFields;
      createdAt: string;
      updatedAt: string;
    }>;

    const remoteIds = new Set(remote.map((r) => r.id));
    // Push local-only decks to R2 once
    for (const item of local) {
      if (!remoteIds.has(item.id)) {
        void syncPresentationToCloud(item);
      }
    }

    const mapped: PresentationLibrarySummary[] = remote.map((r) => {
      const cached = local.find((l) => l.id === r.id);
      return {
        id: r.id,
        title: r.title,
        format: r.format,
        source: r.source,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        info: { ...emptyInfo(), ...(r.info || {}) },
        slideCount: r.slideCount,
        doc:
          cached?.doc?.slides?.length
            ? cached.doc
            : stubDoc({
                id: r.id,
                title: r.title,
                slideCount: r.slideCount,
                updatedAt: r.updatedAt,
              }),
      };
    });

    // Include local-only not yet on server
    for (const item of local) {
      if (!remoteIds.has(item.id)) mapped.push(item);
    }

    return mapped.sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );
  } catch {
    return local;
  }
}

/** Load full deck from R2 (or local cache). */
export async function fetchPresentationLibraryItem(
  id: string,
): Promise<PresentationLibraryItem | null> {
  const local = getPresentationLibraryItem(id);
  try {
    const res = await fetch(`/api/presentations/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return local;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return local;
    const item = data.item as PresentationLibraryItem;
    if (item?.doc?.slides?.length) {
      upsertPresentationLibraryItemLocal(item);
      return item;
    }
  } catch {
    /* fall through */
  }
  return local;
}
