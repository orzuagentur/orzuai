"use client";

import type { ChartElement, ChartKind } from "@/lib/presentation/types";
import { CHART_PRESETS } from "@/lib/presentation/charts";

const DEFAULT_COLORS = [
  "#e8a54b",
  "#60a5fa",
  "#4ade80",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
];

function colorsOf(el: { colors: string[] }) {
  return el.colors.length ? el.colors : DEFAULT_COLORS;
}

export function PresentationChart({
  el,
  compact,
}: {
  el: ChartElement;
  compact?: boolean;
}) {
  const values = el.values.length ? el.values : [0];
  const max = Math.max(...values.map((v) => Math.abs(v)), 1);
  const w = compact ? 160 : 320;
  const h = compact ? 100 : 200;
  const pad = compact ? 10 : 28;
  const colors = colorsOf(el);
  const title = !compact ? (
    <p className="mb-1 truncate text-center text-[11px] font-semibold opacity-90">
      {el.title}
    </p>
  ) : null;

  const wrap = (node: React.ReactNode) => (
    <div className="flex h-full w-full flex-col p-1 text-inherit">{title}{node}</div>
  );

  // KPI big number
  if (el.chart === "kpi") {
    return wrap(
      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className="font-bold leading-none"
          style={{
            color: colors[0],
            fontSize: compact ? 28 : 48,
          }}
        >
          {values[0]}
          {el.labels[0] === "%" ? "%" : el.labels[0] === "$" ? "" : ""}
        </div>
        <div className="mt-1 text-[10px] opacity-70">{el.labels[0] || el.title}</div>
      </div>,
    );
  }

  // Gauge / meter / radial
  if (
    el.chart === "gauge" ||
    el.chart === "meter" ||
    el.chart === "radialBar" ||
    el.chart === "progress"
  ) {
    const pct = Math.min(100, Math.max(0, values[0]));
    if (el.chart === "progress") {
      return wrap(
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
          <rect
            x={pad}
            y={h / 2 - 10}
            width={w - pad * 2}
            height={20}
            rx={10}
            fill="currentColor"
            opacity={0.15}
          />
          <rect
            x={pad}
            y={h / 2 - 10}
            width={((w - pad * 2) * pct) / 100}
            height={20}
            rx={10}
            fill={colors[0]}
          />
          <text
            x={w / 2}
            y={h / 2 + 4}
            textAnchor="middle"
            fontSize={compact ? 10 : 12}
            fill="#111"
            fontWeight={700}
          >
            {pct}%
          </text>
        </svg>,
      );
    }
    const r = compact ? 32 : 58;
    const cx = w / 2;
    const cy = h / 2 + 4;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={compact ? 6 : 10}
          opacity={0.15}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colors[0]}
          strokeWidth={compact ? 6 : 10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={compact ? 14 : 22}
          fontWeight={700}
          fill="currentColor"
        >
          {pct}%
        </text>
      </svg>,
    );
  }

  // Bullet / comparison
  if (el.chart === "bullet" || el.chart === "comparison") {
    const a = values[0] ?? 0;
    const b = values[1] ?? max;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        <rect
          x={pad}
          y={h / 2 - 14}
          width={((w - pad * 2) * Math.min(b, max)) / max}
          height={28}
          rx={4}
          fill="currentColor"
          opacity={0.18}
        />
        <rect
          x={pad}
          y={h / 2 - 8}
          width={((w - pad * 2) * Math.min(a, max)) / max}
          height={16}
          rx={3}
          fill={colors[0]}
        />
        {!compact && (
          <>
            <text x={pad} y={h / 2 - 20} fontSize={9} fill="currentColor" opacity={0.7}>
              {el.labels[0] || "Actual"}: {a}
            </text>
            <text
              x={w - pad}
              y={h / 2 - 20}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
              opacity={0.7}
            >
              {el.labels[1] || "Target"}: {b}
            </text>
          </>
        )}
      </svg>,
    );
  }

  // Semicircle
  if (el.chart === "semicircle") {
    const total = values.reduce((s, v) => s + Math.abs(v), 0) || 1;
    let angle = Math.PI;
    const cx = w / 2;
    const cy = h - pad;
    const r = compact ? 40 : 80;
    const slices = values.map((v, i) => {
      const sweep = (Math.abs(v) / total) * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + sweep);
      const y2 = cy + r * Math.sin(angle + sweep);
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
      angle += sweep;
      return { d, color: colors[i % colors.length] };
    });
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.92} />
        ))}
      </svg>,
    );
  }

  // Pie family
  if (
    el.chart === "pie" ||
    el.chart === "donut" ||
    el.chart === "donutThin" ||
    el.chart === "pieExploded" ||
    el.chart === "ring"
  ) {
    const total = values.reduce((a, b) => a + Math.abs(b), 0) || 1;
    let angle = -Math.PI / 2;
    const cx = w / 2;
    const cy = h / 2 + (compact ? 0 : 8);
    const r =
      el.chart === "ring" ? (compact ? 34 : 64) : compact ? 36 : 68;
    const inner =
      el.chart === "donut"
        ? compact
          ? 16
          : 36
        : el.chart === "donutThin" || el.chart === "ring"
          ? compact
            ? 24
            : 48
          : 0;
    const slices = values.map((v, i) => {
      const sweep = (Math.abs(v) / total) * Math.PI * 2;
      const explode = el.chart === "pieExploded" && i === 0 ? 6 : 0;
      const mid = angle + sweep / 2;
      const ox = Math.cos(mid) * explode;
      const oy = Math.sin(mid) * explode;
      const x1 = cx + ox + r * Math.cos(angle);
      const y1 = cy + oy + r * Math.sin(angle);
      const x2 = cx + ox + r * Math.cos(angle + sweep);
      const y2 = cy + oy + r * Math.sin(angle + sweep);
      const large = sweep > Math.PI ? 1 : 0;
      const d =
        inner > 0
          ? [
              `M ${cx + ox + inner * Math.cos(angle)} ${cy + oy + inner * Math.sin(angle)}`,
              `L ${x1} ${y1}`,
              `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
              `L ${cx + ox + inner * Math.cos(angle + sweep)} ${cy + oy + inner * Math.sin(angle + sweep)}`,
              `A ${inner} ${inner} 0 ${large} 0 ${cx + ox + inner * Math.cos(angle)} ${cy + oy + inner * Math.sin(angle)}`,
              "Z",
            ].join(" ")
          : `M ${cx + ox} ${cy + oy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      angle += sweep;
      return { d, color: colors[i % colors.length] };
    });
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.92} />
        ))}
      </svg>,
    );
  }

  // Line / area / step / sparkline / slope / bump / candlestick
  if (
    el.chart === "line" ||
    el.chart === "area" ||
    el.chart === "areaStack" ||
    el.chart === "step" ||
    el.chart === "sparkline" ||
    el.chart === "slope" ||
    el.chart === "bump" ||
    el.chart === "candlestick"
  ) {
    const pts = values.map((v, i) => {
      const x =
        pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1);
      const y = h - pad - (Math.abs(v) / max) * (h - pad * 2);
      return { x, y, v };
    });
    if (el.chart === "step") {
      const stepPts: string[] = [];
      pts.forEach((p, i) => {
        if (i === 0) stepPts.push(`${p.x},${p.y}`);
        else {
          stepPts.push(`${p.x},${pts[i - 1].y}`);
          stepPts.push(`${p.x},${p.y}`);
        }
      });
      return wrap(
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
          <polyline
            fill="none"
            stroke={colors[0]}
            strokeWidth={compact ? 2 : 3}
            points={stepPts.join(" ")}
          />
        </svg>,
      );
    }
    if (el.chart === "candlestick") {
      return wrap(
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
          {pts.map((p, i) => {
            const open = h - pad - ((Math.abs(p.v) * 0.7) / max) * (h - pad * 2);
            const high = p.y;
            const low = h - pad - ((Math.abs(p.v) * 0.4) / max) * (h - pad * 2);
            const up = i % 2 === 0;
            return (
              <g key={i}>
                <line
                  x1={p.x}
                  y1={high}
                  x2={p.x}
                  y2={low}
                  stroke={colors[up ? 0 : 1]}
                  strokeWidth={1.5}
                />
                <rect
                  x={p.x - 4}
                  y={Math.min(open, high + 8)}
                  width={8}
                  height={Math.max(6, Math.abs(open - (high + 8)))}
                  fill={colors[up ? 0 : 1]}
                />
              </g>
            );
          })}
        </svg>,
      );
    }
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area =
      el.chart === "area" || el.chart === "areaStack"
        ? `${pad},${h - pad} ${line} ${w - pad},${h - pad}`
        : "";
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {area && <polygon fill={colors[0]} opacity={0.28} points={area} />}
        <polyline
          fill="none"
          stroke={colors[0]}
          strokeWidth={el.chart === "sparkline" ? 1.5 : compact ? 2 : 3}
          points={line}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {el.chart !== "sparkline" &&
          pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={compact ? 2.5 : 4} fill={colors[0]} />
          ))}
      </svg>,
    );
  }

  // Radar
  if (el.chart === "radar") {
    const n = values.length;
    const cx = w / 2;
    const cy = h / 2 + (compact ? 0 : 4);
    const r = compact ? 32 : 62;
    const poly = values
      .map((v, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const rr = (Math.abs(v) / max) * r;
        return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      })
      .join(" ");
    const ring = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        <polygon points={ring} fill="none" stroke="currentColor" opacity={0.2} />
        <polygon
          points={poly}
          fill={colors[0]}
          opacity={0.35}
          stroke={colors[0]}
          strokeWidth={2}
        />
      </svg>,
    );
  }

  // Scatter / bubble / lollipop
  if (el.chart === "scatter" || el.chart === "bubble") {
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity={0.25} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" opacity={0.25} />
        {values.map((v, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1);
          const y = h - pad - (Math.abs(v) / max) * (h - pad * 2);
          const rad =
            el.chart === "bubble"
              ? 4 + (Math.abs(v) / max) * (compact ? 8 : 14)
              : compact
                ? 3.5
                : 6;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={rad}
              fill={colors[i % colors.length]}
              opacity={0.85}
            />
          );
        })}
      </svg>,
    );
  }

  if (el.chart === "lollipop") {
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {values.map((v, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1);
          const y = h - pad - (Math.abs(v) / max) * (h - pad * 2);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={h - pad}
                x2={x}
                y2={y}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
              />
              <circle cx={x} cy={y} r={compact ? 4 : 6} fill={colors[i % colors.length]} />
            </g>
          );
        })}
      </svg>,
    );
  }

  // Heatmap
  if (el.chart === "heatmap") {
    const cols = Math.ceil(Math.sqrt(values.length));
    const rows = Math.ceil(values.length / cols);
    const cw = (w - pad * 2) / cols - 2;
    const rh = (h - pad * 2) / rows - 2;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {values.map((v, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const intensity = Math.abs(v) / max;
          return (
            <rect
              key={i}
              x={pad + col * (cw + 2)}
              y={pad + row * (rh + 2)}
              width={cw}
              height={rh}
              rx={2}
              fill={colors[0]}
              opacity={0.2 + intensity * 0.8}
            />
          );
        })}
      </svg>,
    );
  }

  // Treemap (simple row of proportional blocks)
  if (el.chart === "treemap") {
    const total = values.reduce((a, b) => a + Math.abs(b), 0) || 1;
    let x = pad;
    const barH = h - pad * 2;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {values.map((v, i) => {
          const bw = (Math.abs(v) / total) * (w - pad * 2);
          const node = (
            <g key={i}>
              <rect
                x={x}
                y={pad}
                width={Math.max(2, bw - 2)}
                height={barH}
                fill={colors[i % colors.length]}
                opacity={0.9}
                rx={3}
              />
              {!compact && bw > 28 && (
                <text
                  x={x + bw / 2}
                  y={h / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#111"
                  fontWeight={600}
                >
                  {el.labels[i]}
                </text>
              )}
            </g>
          );
          x += bw;
          return node;
        })}
      </svg>,
    );
  }

  // Funnel / pyramid
  if (el.chart === "funnel" || el.chart === "pyramid") {
    const top = Math.max(...values.map((v) => Math.abs(v)), 1);
    const ordered =
      el.chart === "pyramid" ? [...values].sort((a, b) => a - b) : values;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {ordered.map((v, i) => {
          const rowH = (h - pad * 2) / ordered.length - 4;
          const bw = (Math.abs(v) / top) * (w - pad * 2);
          const x = (w - bw) / 2;
          const y = pad + i * ((h - pad * 2) / ordered.length);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={bw}
              height={Math.max(6, rowH)}
              rx={4}
              fill={colors[i % colors.length]}
              opacity={0.9}
            />
          );
        })}
      </svg>,
    );
  }

  // Waterfall
  if (el.chart === "waterfall") {
    let running = 0;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {values.map((v, i) => {
          const isTotal = i === 0 || i === values.length - 1;
          const start = isTotal ? 0 : running;
          if (!isTotal) running += v;
          const end = isTotal ? v : running;
          const y1 = h - pad - (Math.max(start, end) / max) * (h - pad * 2);
          const y2 = h - pad - (Math.min(start, end) / max) * (h - pad * 2);
          const x = pad + i * ((w - pad * 2) / values.length) + 4;
          const bw = (w - pad * 2) / values.length - 8;
          return (
            <rect
              key={i}
              x={x}
              y={y1}
              width={bw}
              height={Math.max(4, y2 - y1)}
              rx={3}
              fill={v < 0 ? colors[1] : colors[0]}
              opacity={0.9}
            />
          );
        })}
      </svg>,
    );
  }

  // Horizontal bars family
  if (
    el.chart === "barH" ||
    el.chart === "stackedBarH" ||
    el.chart === "stacked"
  ) {
    if (el.chart === "stacked" || el.chart === "stackedBarH") {
      const total = values.reduce((a, b) => a + Math.abs(b), 0) || 1;
      let x = pad;
      const barH = compact ? 18 : 36;
      const y = (h - barH) / 2;
      return wrap(
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
          {values.map((v, i) => {
            const bw = (Math.abs(v) / total) * (w - pad * 2);
            const node = (
              <rect
                key={i}
                x={x}
                y={y}
                width={bw}
                height={barH}
                fill={colors[i % colors.length]}
              />
            );
            x += bw;
            return node;
          })}
        </svg>,
      );
    }
    const rowH = (h - pad * 2) / values.length - 4;
    return wrap(
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {values.map((v, i) => {
          const bw = (Math.abs(v) / max) * (w - pad * 2 - (compact ? 0 : 24));
          const y = pad + i * ((h - pad * 2) / values.length) + 2;
          return (
            <rect
              key={i}
              x={pad}
              y={y}
              width={bw}
              height={Math.max(4, rowH)}
              rx={3}
              fill={colors[i % colors.length]}
              opacity={0.9}
            />
          );
        })}
      </svg>,
    );
  }

  // Default column / grouped / dual
  const barW = (w - pad * 2) / values.length - (compact ? 4 : 8);
  const grouped = el.chart === "groupedBar" || el.chart === "dualColumn";
  return wrap(
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
      {values.map((v, i) => {
        const bh = (Math.abs(v) / max) * (h - pad * 2);
        const x = pad + i * ((w - pad * 2) / values.length) + 2;
        const y = h - pad - bh;
        if (grouped) {
          const half = Math.max(2, barW / 2 - 1);
          const bh2 = bh * 0.75;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={half}
                height={bh}
                rx={2}
                fill={colors[0]}
                opacity={0.9}
              />
              <rect
                x={x + half + 2}
                y={h - pad - bh2}
                width={half}
                height={bh2}
                rx={2}
                fill={colors[1]}
                opacity={0.9}
              />
            </g>
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(4, barW)}
            height={bh}
            rx={compact ? 2 : 4}
            fill={colors[i % colors.length]}
            opacity={0.9}
          />
        );
      })}
    </svg>,
  );
}

export function ChartKindPreview({
  kind,
  accent = "#e8a54b",
}: {
  kind: ChartKind;
  accent?: string;
}) {
  const preset = CHART_PRESETS.find((p) => p.kind === kind) ?? CHART_PRESETS[0];
  const el: ChartElement = {
    id: "preview",
    type: "chart",
    chart: kind,
    title: "",
    labels: preset.labels,
    values: preset.values,
    colors: [accent, "#60a5fa", "#4ade80", "#f472b6", "#a78bfa"],
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    rotation: 0,
    zIndex: 1,
    animation: "none",
    animationDelay: 0,
    animationDuration: 0,
  };
  return (
    <div className="h-14 w-full text-white/70">
      <PresentationChart el={el} compact />
    </div>
  );
}
