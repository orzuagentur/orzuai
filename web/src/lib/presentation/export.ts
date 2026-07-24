import type { PresentationDoc, SlideElement } from "./types";
import { getTheme } from "./themes";

function solidFromGradient(bg: string): string {
  const m = bg.match(/#[0-9a-fA-F]{3,8}/);
  return (m?.[0] || "#0f1117").replace("#", "");
}

function sanitize(name: string) {
  return name.replace(/[^\w\s-]+/g, "").trim().slice(0, 60) || "presentation";
}

function mapChartType(chart: string): "bar" | "line" | "pie" {
  if (
    chart === "pie" ||
    chart === "donut" ||
    chart === "donutThin" ||
    chart === "pieExploded" ||
    chart === "ring" ||
    chart === "semicircle"
  ) {
    return "pie";
  }
  if (
    chart === "line" ||
    chart === "area" ||
    chart === "areaStack" ||
    chart === "scatter" ||
    chart === "step" ||
    chart === "sparkline" ||
    chart === "slope" ||
    chart === "bump" ||
    chart === "candlestick"
  ) {
    return "line";
  }
  return "bar";
}

export function solidColorFromBackground(bg: string): string {
  const m = bg.match(/#[0-9a-fA-F]{3,8}/);
  return m?.[0] || "#0f1117";
}

function addElement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pptx: any,
  el: SlideElement,
  fallbackColor: string,
) {
  const x = `${el.x}%`;
  const y = `${el.y}%`;
  const w = `${el.w}%`;
  const h = `${el.h}%`;

  if (el.type === "text") {
    s.addText(el.text, {
      x,
      y,
      w,
      h,
      fontSize: Math.max(10, Math.round(el.fontSize * 0.55)),
      color: el.color.replace("#", ""),
      bold: el.fontWeight >= 700,
      italic: Boolean(el.italic),
      underline: el.underline ? { style: "sng" } : undefined,
      align: el.align,
      fontFace: "Arial",
      valign: "middle",
    });
    return;
  }

  if (el.type === "emoji") {
    s.addText(el.emoji, {
      x,
      y,
      w,
      h,
      fontSize: 28,
      align: "center",
      valign: "middle",
    });
    return;
  }

  if (el.type === "shape") {
    const fill = el.fill.startsWith("#") ? el.fill.replace("#", "") : "E8A54B";
    let shape = pptx.ShapeType.rect;
    if (el.shape === "ellipse") shape = pptx.ShapeType.ellipse;
    else if (el.shape === "roundRect") shape = pptx.ShapeType.roundRect;
    else if (el.shape === "triangle") shape = pptx.ShapeType.triangle;
    else if (el.shape === "line") shape = pptx.ShapeType.line;
    else if (el.shape === "arrow") shape = pptx.ShapeType.rightArrow;
    else if (el.shape === "star") shape = pptx.ShapeType.star5;
    else if (el.shape === "diamond") shape = pptx.ShapeType.diamond;
    else if (el.shape === "hexagon") shape = pptx.ShapeType.hexagon;
    else if (el.shape === "pentagon") shape = pptx.ShapeType.pentagon;
    else if (el.shape === "chevron") shape = pptx.ShapeType.chevron;
    else if (el.shape === "parallelogram")
      shape = pptx.ShapeType.parallelogram;
    else if (el.shape === "trapezoid") shape = pptx.ShapeType.trapezoid;
    else if (el.shape === "cross") shape = pptx.ShapeType.plus;

    s.addShape(shape, {
      x,
      y,
      w,
      h,
      fill: { color: fill, transparency: Math.round((1 - el.opacity) * 100) },
      line: el.strokeWidth
        ? {
            color: (el.stroke.startsWith("#") ? el.stroke : "#000000").replace(
              "#",
              "",
            ),
            width: el.strokeWidth,
          }
        : { color: fill, width: 0 },
    });
    return;
  }

  if (el.type === "image" && el.src && !el.src.startsWith("blob:")) {
    try {
      s.addImage({ path: el.src, x, y, w, h });
    } catch {
      /* remote CORS */
    }
    return;
  }

  if (el.type === "qr" && el.src) {
    try {
      s.addImage({ data: el.src, x, y, w, h });
    } catch {
      try {
        s.addImage({ path: el.src, x, y, w, h });
      } catch {
        /* skip */
      }
    }
    return;
  }

  if (el.type === "chart") {
    s.addChart(mapChartType(el.chart), {
      x,
      y,
      w,
      h,
      series: [{ name: el.title, values: el.values }],
      categories: el.labels,
      showTitle: true,
      title: el.title,
      showValue: false,
    });
    return;
  }

  if (el.type === "icon") {
    s.addText("◆", {
      x,
      y,
      w,
      h,
      fontSize: 28,
      color: (el.color || fallbackColor).replace("#", ""),
      align: "center",
      valign: "middle",
    });
  }
}

export async function downloadPresentationJson(doc: PresentationDoc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitize(doc.title)}.orzu.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exports every slide as its own PPTX page */
export async function downloadPresentationPptx(doc: PresentationDoc) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.author = "OrzuAi";
  pptx.title = doc.title;
  pptx.layout = "LAYOUT_WIDE";
  const theme = getTheme(doc.themeId);

  for (const slide of doc.slides) {
    const s = pptx.addSlide();
    s.background = { color: solidFromGradient(slide.background) };
    const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      addElement(s, pptx, el, theme.titleColor);
    }
  }

  await pptx.writeFile({ fileName: `${sanitize(doc.title)}.pptx` });
}

/** Print/PDF — all slides as separate pages with real slide colors */
export function printPresentationPdf() {
  const prev = document.documentElement.style.getPropertyValue(
    "print-color-adjust",
  );
  document.documentElement.style.setProperty("print-color-adjust", "exact");
  document.documentElement.style.setProperty(
    "-webkit-print-color-adjust",
    "exact",
  );
  window.print();
  window.setTimeout(() => {
    if (prev) {
      document.documentElement.style.setProperty("print-color-adjust", prev);
    } else {
      document.documentElement.style.removeProperty("print-color-adjust");
    }
    document.documentElement.style.removeProperty(
      "-webkit-print-color-adjust",
    );
  }, 500);
}

/** Word-compatible .doc (HTML) — one section per slide */
export async function downloadPresentationWord(doc: PresentationDoc) {
  const theme = getTheme(doc.themeId);
  const pages = doc.slides
    .map((slide, i) => {
      const solid = solidColorFromBackground(slide.background);
      const bits = [...slide.elements]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => {
          if (el.type === "text") {
            return `<p style="color:${el.color};font-size:${Math.max(12, el.fontSize * 0.55)}pt;font-weight:${el.fontWeight};text-align:${el.align}">${escapeHtml(el.text)}</p>`;
          }
          if (el.type === "image" || el.type === "qr") {
            return `<p><img src="${escapeAttr(el.src)}" alt="" style="max-width:80%;height:auto" /></p>`;
          }
          if (el.type === "emoji") {
            return el.src
              ? `<p><img src="${escapeAttr(el.src)}" width="48" height="48" /></p>`
              : `<p style="font-size:28pt">${escapeHtml(el.emoji)}</p>`;
          }
          if (el.type === "chart") {
            return `<p><b>${escapeHtml(el.title)}</b><br/>${escapeHtml(el.labels.join(", "))} → ${escapeHtml(el.values.join(", "))}</p>`;
          }
          if (el.type === "icon") {
            return `<p style="color:${el.color}">◆ ${escapeHtml(el.iconId)}</p>`;
          }
          if (el.type === "shape") {
            return `<p style="color:${el.fill}">■ ${escapeHtml(el.shape)}</p>`;
          }
          return "";
        })
        .join("\n");
      return `
        <div style="page-break-after:always;background:${solid};color:${theme.titleColor};padding:36pt;min-height:480pt">
          <p style="font-size:10pt;opacity:.6">Slide ${i + 1} — ${escapeHtml(slide.name)}</p>
          ${bits || "<p>—</p>"}
        </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title></head><body>${pages}</body></html>`;
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitize(doc.title)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
