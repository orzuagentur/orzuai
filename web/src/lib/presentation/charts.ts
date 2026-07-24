import type { ChartElement, ChartKind } from "./types";

export type ChartPreset = {
  id: string;
  kind: ChartKind;
  label: string;
  hint: string;
  title: string;
  labels: string[];
  values: number[];
  colors?: string[];
};

const PALETTES: string[][] = [
  ["#e8a54b", "#60a5fa", "#4ade80", "#f472b6", "#a78bfa", "#22d3ee"],
  ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a3e635"],
  ["#f97316", "#ef4444", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6"],
  ["#94a3b8", "#64748b", "#e2e8f0", "#38bdf8", "#f472b6", "#a78bfa"],
  ["#14b8a6", "#0ea5e9", "#6366f1", "#ec4899", "#f59e0b", "#84cc16"],
];

type Seed = {
  kind: ChartKind;
  label: string;
  hint: string;
  title: string;
  labels: string[];
  values: number[];
  palette?: number;
};

const BASE: Seed[] = [
  { kind: "bar", label: "Column", hint: "Compare categories", title: "Revenue", labels: ["Q1", "Q2", "Q3", "Q4"], values: [42, 58, 51, 74] },
  { kind: "bar", label: "Sales columns", hint: "Monthly sales", title: "Sales", labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], values: [30, 44, 38, 55, 62, 70], palette: 1 },
  { kind: "bar", label: "Team output", hint: "By team", title: "Output", labels: ["Design", "Eng", "Sales", "CS"], values: [65, 88, 54, 72], palette: 2 },
  { kind: "barH", label: "Bar", hint: "Horizontal ranking", title: "Top markets", labels: ["US", "EU", "APAC", "LATAM"], values: [88, 72, 61, 44] },
  { kind: "barH", label: "NPS ranks", hint: "Score ranking", title: "NPS", labels: ["A", "B", "C", "D", "E"], values: [92, 81, 70, 55, 40], palette: 1 },
  { kind: "barH", label: "Priority", hint: "Backlog impact", title: "Impact", labels: ["P0", "P1", "P2", "P3"], values: [95, 70, 45, 20], palette: 2 },
  { kind: "line", label: "Line", hint: "Trend over time", title: "Growth", labels: ["Jan", "Mar", "May", "Jul", "Sep"], values: [20, 32, 28, 45, 58] },
  { kind: "line", label: "DAU trend", hint: "Daily active", title: "DAU", labels: ["M", "T", "W", "T", "F", "S", "S"], values: [40, 42, 48, 45, 55, 60, 52], palette: 1 },
  { kind: "line", label: "MRR line", hint: "Recurring revenue", title: "MRR", labels: ["Q1", "Q2", "Q3", "Q4"], values: [12, 18, 25, 34], palette: 4 },
  { kind: "area", label: "Area", hint: "Volume over time", title: "Users", labels: ["W1", "W2", "W3", "W4", "W5"], values: [12, 22, 30, 28, 48] },
  { kind: "area", label: "Traffic area", hint: "Sessions", title: "Traffic", labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], values: [50, 62, 55, 70, 80], palette: 1 },
  { kind: "areaStack", label: "Stacked area", hint: "Layered volume", title: "Sources", labels: ["W1", "W2", "W3", "W4"], values: [20, 35, 45, 60], palette: 2 },
  { kind: "pie", label: "Pie", hint: "Share of total", title: "Mix", labels: ["A", "B", "C", "D"], values: [35, 25, 22, 18] },
  { kind: "pie", label: "Budget pie", hint: "Spend share", title: "Budget", labels: ["Ads", "R&D", "Ops", "HR"], values: [40, 25, 20, 15], palette: 2 },
  { kind: "pieExploded", label: "Exploded pie", hint: "Highlight slice", title: "Share", labels: ["Core", "New", "Other"], values: [55, 30, 15], palette: 1 },
  { kind: "donut", label: "Donut", hint: "Share with center", title: "Segments", labels: ["Pro", "Team", "Free"], values: [48, 32, 20] },
  { kind: "donut", label: "Plan mix", hint: "Subscription", title: "Plans", labels: ["Basic", "Plus", "Max"], values: [40, 35, 25], palette: 4 },
  { kind: "donutThin", label: "Thin donut", hint: "Slim ring", title: "Status", labels: ["Done", "Open", "Blocked"], values: [60, 30, 10], palette: 1 },
  { kind: "ring", label: "Multi-ring", hint: "Concentric rings", title: "Goals", labels: ["A", "B", "C"], values: [80, 55, 35], palette: 2 },
  { kind: "semicircle", label: "Semi pie", hint: "Half circle", title: "Capacity", labels: ["Used", "Free"], values: [68, 32], palette: 1 },
  { kind: "radar", label: "Radar", hint: "Multi-axis score", title: "Skills", labels: ["Speed", "Quality", "UX", "SEO", "Support"], values: [80, 70, 90, 65, 75] },
  { kind: "radar", label: "Brand radar", hint: "Brand pillars", title: "Brand", labels: ["Trust", "Love", "Reach", "Value", "Voice"], values: [75, 82, 60, 70, 88], palette: 2 },
  { kind: "scatter", label: "Scatter", hint: "Correlation dots", title: "Reach vs convert", labels: ["A", "B", "C", "D", "E", "F"], values: [22, 48, 35, 70, 55, 82] },
  { kind: "scatter", label: "Cost scatter", hint: "Spend vs return", title: "ROI dots", labels: ["1", "2", "3", "4", "5", "6", "7"], values: [15, 40, 28, 60, 45, 75, 50], palette: 3 },
  { kind: "bubble", label: "Bubble", hint: "Sized dots", title: "Segments", labels: ["S", "M", "L", "XL", "XXL"], values: [20, 45, 35, 70, 55], palette: 1 },
  { kind: "funnel", label: "Funnel", hint: "Conversion stages", title: "Pipeline", labels: ["Visit", "Lead", "Trial", "Paid"], values: [100, 62, 34, 18] },
  { kind: "funnel", label: "Hire funnel", hint: "Recruiting", title: "Hiring", labels: ["Apply", "Screen", "Interview", "Offer"], values: [200, 90, 40, 12], palette: 2 },
  { kind: "pyramid", label: "Pyramid", hint: "Hierarchy levels", title: "Org", labels: ["Exec", "Mgr", "Lead", "IC"], values: [5, 15, 35, 80], palette: 1 },
  { kind: "stacked", label: "Stacked bar", hint: "Parts of a whole", title: "Channels", labels: ["Ads", "Organic", "Partner", "Direct"], values: [30, 40, 15, 15] },
  { kind: "stackedBarH", label: "Stacked H", hint: "Horizontal stack", title: "Mix H", labels: ["A", "B", "C", "D"], values: [25, 25, 30, 20], palette: 4 },
  { kind: "groupedBar", label: "Grouped", hint: "Side-by-side", title: "YoY", labels: ["Q1", "Q2", "Q3", "Q4"], values: [40, 55, 48, 70], palette: 1 },
  { kind: "dualColumn", label: "Dual column", hint: "Two series look", title: "Plan vs Act", labels: ["Jan", "Feb", "Mar", "Apr"], values: [50, 45, 60, 70], palette: 2 },
  { kind: "gauge", label: "Gauge", hint: "0–100 meter", title: "Health", labels: ["Score"], values: [72] },
  { kind: "gauge", label: "CSAT gauge", hint: "Satisfaction", title: "CSAT", labels: ["%"], values: [86], palette: 1 },
  { kind: "meter", label: "Meter", hint: "Dial meter", title: "Load", labels: ["%"], values: [58], palette: 2 },
  { kind: "bullet", label: "Bullet", hint: "Target vs actual", title: "KPI", labels: ["Actual", "Target"], values: [74, 90] },
  { kind: "bullet", label: "Quota bullet", hint: "Quota track", title: "Quota", labels: ["Done", "Goal"], values: [62, 100], palette: 1 },
  { kind: "progress", label: "Progress", hint: "Completion bar", title: "Launch", labels: ["Done"], values: [68] },
  { kind: "progress", label: "Sprint %", hint: "Sprint done", title: "Sprint", labels: ["%"], values: [82], palette: 4 },
  { kind: "radialBar", label: "Radial bar", hint: "Circular progress", title: "OKR", labels: ["%"], values: [64], palette: 1 },
  { kind: "waterfall", label: "Waterfall", hint: "Bridge changes", title: "P&L bridge", labels: ["Start", "+Rev", "-Cost", "+Other", "End"], values: [50, 30, -20, 10, 70] },
  { kind: "waterfall", label: "Cash bridge", hint: "Cash flow", title: "Cash", labels: ["Open", "In", "Out", "Close"], values: [40, 35, -25, 50], palette: 2 },
  { kind: "heatmap", label: "Heatmap", hint: "Intensity grid", title: "Activity", labels: ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"], values: [20, 40, 60, 30, 80, 10, 5, 35, 55, 70, 45, 90] },
  { kind: "heatmap", label: "Risk heat", hint: "Risk matrix", title: "Risk", labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], values: [10, 40, 70, 30, 55, 85, 20, 60, 95], palette: 2 },
  { kind: "lollipop", label: "Lollipop", hint: "Dot + stem", title: "Scores", labels: ["A", "B", "C", "D", "E"], values: [40, 65, 50, 80, 55] },
  { kind: "lollipop", label: "Feature use", hint: "Adoption", title: "Features", labels: ["A", "B", "C", "D"], values: [90, 55, 70, 35], palette: 1 },
  { kind: "step", label: "Step line", hint: "Step changes", title: "Pricing", labels: ["Y1", "Y2", "Y3", "Y4", "Y5"], values: [10, 10, 20, 20, 35] },
  { kind: "step", label: "Tier steps", hint: "Tier jumps", title: "Tiers", labels: ["T1", "T2", "T3", "T4"], values: [25, 40, 40, 70], palette: 3 },
  { kind: "sparkline", label: "Sparkline", hint: "Tiny trend", title: "Pulse", labels: ["1", "2", "3", "4", "5", "6", "7", "8"], values: [12, 18, 14, 22, 20, 28, 24, 32] },
  { kind: "sparkline", label: "Mini spark", hint: "Inline trend", title: "Signal", labels: ["a", "b", "c", "d", "e", "f"], values: [8, 12, 9, 16, 14, 20], palette: 1 },
  { kind: "treemap", label: "Treemap", hint: "Nested blocks", title: "Portfolio", labels: ["Core", "Growth", "Bet", "Other"], values: [40, 25, 20, 15] },
  { kind: "treemap", label: "Spend map", hint: "Budget blocks", title: "Spend", labels: ["Cloud", "Ads", "Tools", "People"], values: [35, 30, 15, 20], palette: 2 },
  { kind: "kpi", label: "KPI number", hint: "Big metric", title: "ARR", labels: ["$"], values: [240], palette: 1 },
  { kind: "kpi", label: "KPI growth", hint: "Big %", title: "Growth", labels: ["%"], values: [38], palette: 4 },
  { kind: "comparison", label: "Compare", hint: "A vs B bars", title: "Before / After", labels: ["Before", "After"], values: [45, 78] },
  { kind: "comparison", label: "A/B test", hint: "Variant lift", title: "A/B", labels: ["Control", "Variant"], values: [32, 48], palette: 1 },
  { kind: "slope", label: "Slope", hint: "Two-point change", title: "2024→2025", labels: ["2024", "2025"], values: [40, 72] },
  { kind: "slope", label: "Region slope", hint: "Region shift", title: "Region", labels: ["Start", "Now"], values: [55, 35], palette: 2 },
  { kind: "bump", label: "Bump", hint: "Rank path", title: "Rank", labels: ["W1", "W2", "W3", "W4", "W5"], values: [3, 2, 2, 1, 1] },
  { kind: "candlestick", label: "Candles", hint: "OHLC style", title: "Price", labels: ["M1", "M2", "M3", "M4", "M5"], values: [40, 55, 48, 62, 58], palette: 2 },
  { kind: "bar", label: "Campaign", hint: "Campaign ROI", title: "Campaigns", labels: ["A", "B", "C", "D", "E"], values: [22, 48, 35, 60, 42], palette: 3 },
  { kind: "area", label: "Pipeline area", hint: "Pipeline $", title: "Pipeline", labels: ["S1", "S2", "S3", "S4"], values: [80, 95, 70, 110], palette: 4 },
  { kind: "donut", label: "Device mix", hint: "Devices", title: "Devices", labels: ["Mobile", "Desktop", "Tablet"], values: [55, 35, 10], palette: 3 },
  { kind: "radar", label: "Product radar", hint: "Product score", title: "Product", labels: ["Perf", "UX", "Docs", "API", "Price"], values: [70, 85, 60, 75, 50], palette: 4 },
];

export const CHART_PRESETS: ChartPreset[] = BASE.map((b, i) => ({
  id: `chart_${i + 1}_${b.kind}`,
  kind: b.kind,
  label: b.label,
  hint: b.hint,
  title: b.title,
  labels: b.labels,
  values: b.values,
  colors: PALETTES[b.palette ?? 0],
}));

export function chartElementFromPreset(
  preset: ChartPreset,
  colors?: string[],
): Pick<ChartElement, "chart" | "title" | "labels" | "values" | "colors"> {
  return {
    chart: preset.kind,
    title: preset.title,
    labels: preset.labels,
    values: preset.values,
    colors: colors?.length ? colors : preset.colors?.length ? preset.colors : PALETTES[0],
  };
}

export const CHART_COUNT = CHART_PRESETS.length;
