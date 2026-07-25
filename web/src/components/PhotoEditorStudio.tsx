"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

const ACCENT = "#E8A54B";

type Tool =
  | "upload"
  | "adjust"
  | "filters"
  | "text"
  | "crop"
  | "layers";

type Layer = {
  id: string;
  kind: "image" | "text";
  label: string;
  src?: string;
  text?: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "None", css: "none" },
  { id: "vivid", label: "Vivid", css: "contrast(1.15) saturate(1.3)" },
  { id: "soft", label: "Soft", css: "contrast(0.95) brightness(1.05) saturate(0.9)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.15)" },
  { id: "warm", label: "Warm", css: "sepia(0.25) saturate(1.1)" },
  { id: "cool", label: "Cool", css: "hue-rotate(15deg) saturate(1.05)" },
  { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.08) saturate(0.8)" },
  { id: "punch", label: "Punch", css: "contrast(1.25) saturate(1.2)" },
];

const LEFT: { id: Tool; label: string; icon: string }[] = [
  { id: "upload", label: "Media", icon: "+" },
  { id: "adjust", label: "Adjust", icon: "☀" },
  { id: "filters", label: "Filters", icon: "◐" },
  { id: "text", label: "Text", icon: "T" },
  { id: "crop", label: "Crop", icon: "⬚" },
  { id: "layers", label: "Layers", icon: "☰" },
];

/** Canva-like photo editor workspace for Creators. */
export function PhotoEditorStudio() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tool, setTool] = useState<Tool>("upload");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("none");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [textDraft, setTextDraft] = useState("Your text");

  const active = layers.find((l) => l.id === activeId) || null;
  const baseImage = layers.find((l) => l.kind === "image");

  const filterCss = [
    FILTERS.find((f) => f.id === filter)?.css,
    Math.abs(brightness) > 0.01 ? `brightness(${1 + brightness})` : null,
    Math.abs(contrast - 1) > 0.01 ? `contrast(${contrast})` : null,
    Math.abs(saturation - 1) > 0.01 ? `saturate(${saturation})` : null,
  ]
    .filter((x) => x && x !== "none")
    .join(" ");

  const onUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const id = `img-${Date.now()}`;
    setLayers((prev) => [
      ...prev,
      {
        id,
        kind: "image",
        label: file.name.slice(0, 28),
        src: url,
        x: 50,
        y: 50,
        scale: 1,
        opacity: 1,
      },
    ]);
    setActiveId(id);
    setTool("adjust");
    e.target.value = "";
  }, []);

  function addText() {
    const id = `txt-${Date.now()}`;
    setLayers((prev) => [
      ...prev,
      {
        id,
        kind: "text",
        label: textDraft.slice(0, 24) || "Text",
        text: textDraft || "Your text",
        x: 50,
        y: 40,
        scale: 1,
        opacity: 1,
      },
    ]);
    setActiveId(id);
  }

  function updateActive(patch: Partial<Layer>) {
    if (!activeId) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, ...patch } : l)),
    );
  }

  function removeActive() {
    if (!activeId) return;
    setLayers((prev) => prev.filter((l) => l.id !== activeId));
    setActiveId(null);
  }

  useEffect(() => {
    return () => {
      layers.forEach((l) => {
        if (l.src?.startsWith("blob:")) URL.revokeObjectURL(l.src);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col text-white"
      style={{ background: "#0a0a0a" }}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/dashboard/creators"
          className="text-sm font-medium text-white/60 hover:text-white"
        >
          ← Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold">
          Photo editor
        </h1>
        <button
          type="button"
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-black"
          style={{ background: ACCENT }}
          onClick={() => {
            const img = document.querySelector<HTMLImageElement>("[data-photo-export]");
            if (!img) return;
            const a = document.createElement("a");
            a.href = img.src;
            a.download = "orzuai-photo.jpg";
            a.click();
          }}
        >
          Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left tools */}
        <nav
          className="flex w-[72px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 py-2"
          style={{ background: "#0c0c0c" }}
        >
          {LEFT.map((item) => {
            const on = tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTool(item.id);
                  if (item.id === "upload") fileRef.current?.click();
                }}
                className="mx-auto flex w-[64px] flex-col items-center gap-0.5 rounded-lg px-1 py-2"
                style={{
                  background: on ? "rgba(232,165,75,0.16)" : "transparent",
                  color: on ? ACCENT : "rgba(255,255,255,0.55)",
                }}
              >
                <span className="text-base">{item.icon}</span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onUpload}
          />
        </nav>

        {/* Canvas */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center bg-[#121212] p-6">
          <div
            className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            style={{ width: "min(100%, 520px)", aspectRatio: "4/5" }}
          >
            {!baseImage ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 text-white/50 transition hover:text-white/80"
              >
                <span className="text-3xl">+</span>
                <span className="text-sm">Upload photo</span>
              </button>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-photo-export
                  src={baseImage.src}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  style={{
                    filter: filterCss || undefined,
                    opacity: baseImage.opacity,
                    transform: `scale(${baseImage.scale})`,
                  }}
                />
                {layers
                  .filter((l) => l.kind === "text")
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setActiveId(l.id)}
                      className="absolute max-w-[80%] text-center font-bold text-white drop-shadow-lg"
                      style={{
                        left: `${l.x}%`,
                        top: `${l.y}%`,
                        transform: `translate(-50%, -50%) scale(${l.scale})`,
                        opacity: l.opacity,
                        fontSize: "1.25rem",
                        outline:
                          activeId === l.id
                            ? `2px solid ${ACCENT}`
                            : undefined,
                      }}
                    >
                      {l.text}
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>

        {/* Right properties */}
        <aside
          className="hidden w-[280px] shrink-0 flex-col border-l border-white/10 md:flex"
          style={{ background: "#0e0e0e" }}
        >
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Properties
            </p>
            <p className="mt-1 text-sm font-semibold">
              {active?.label || "Select a layer"}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {active && (
              <>
                <label className="block space-y-1 text-[10px] text-white/50">
                  Opacity {Math.round(active.opacity * 100)}%
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.01}
                    value={active.opacity}
                    onChange={(e) =>
                      updateActive({ opacity: Number(e.target.value) })
                    }
                    className="w-full accent-[#E8A54B]"
                  />
                </label>
                <label className="block space-y-1 text-[10px] text-white/50">
                  Scale {active.scale.toFixed(2)}
                  <input
                    type="range"
                    min={0.4}
                    max={2}
                    step={0.02}
                    value={active.scale}
                    onChange={(e) =>
                      updateActive({ scale: Number(e.target.value) })
                    }
                    className="w-full accent-[#E8A54B]"
                  />
                </label>
                {active.kind === "text" && (
                  <input
                    value={active.text || ""}
                    onChange={(e) =>
                      updateActive({
                        text: e.target.value,
                        label: e.target.value.slice(0, 24),
                      })
                    }
                    className="w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={removeActive}
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300"
                >
                  Remove layer
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom dock */}
      <div className="shrink-0 border-t border-white/10" style={{ background: "#111" }}>
        <div className="min-h-[120px] px-4 py-3">
          {tool === "upload" && (
            <p className="text-sm text-white/50">
              Upload JPEG / PNG / WebP from the Media button. Your canvas is ready.
            </p>
          )}
          {tool === "adjust" && (
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {(
                [
                  ["Brightness", brightness, -0.35, 0.35, setBrightness],
                  ["Contrast", contrast, 0.6, 1.6, setContrast],
                  ["Saturation", saturation, 0, 1.8, setSaturation],
                ] as const
              ).map(([label, val, min, max, set]) => (
                <label key={label} className="block space-y-1 text-[10px] text-white/50">
                  {label}
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.01}
                    value={val}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-full accent-[#E8A54B]"
                  />
                </label>
              ))}
            </div>
          )}
          {tool === "filters" && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    background:
                      filter === f.id ? "rgba(232,165,75,0.2)" : "rgba(255,255,255,0.06)",
                    color: filter === f.id ? ACCENT : "rgba(255,255,255,0.7)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {tool === "text" && (
            <div className="flex max-w-lg flex-wrap items-center gap-2">
              <input
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                className="min-w-[180px] flex-1 rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm"
                placeholder="Add text…"
              />
              <button
                type="button"
                onClick={addText}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-black"
                style={{ background: ACCENT }}
              >
                Add text
              </button>
            </div>
          )}
          {tool === "crop" && (
            <p className="text-sm text-white/50">
              Use Scale on the image layer for a simple zoom-crop. Full crop
              handles coming next.
            </p>
          )}
          {tool === "layers" && (
            <div className="flex gap-2 overflow-x-auto">
              {layers.length === 0 ? (
                <p className="text-sm text-white/45">No layers yet</p>
              ) : (
                layers.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveId(l.id)}
                    className="shrink-0 rounded-lg border px-3 py-2 text-xs"
                    style={{
                      borderColor:
                        activeId === l.id
                          ? "rgba(232,165,75,0.55)"
                          : "rgba(255,255,255,0.12)",
                      background:
                        activeId === l.id
                          ? "rgba(232,165,75,0.12)"
                          : "transparent",
                    }}
                  >
                    {l.kind === "image" ? "🖼" : "T"} {l.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
