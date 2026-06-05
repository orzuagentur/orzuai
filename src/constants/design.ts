/** Mirrors CSS variables in globals.css for non-CSS consumers (charts, emails). */
export const COLORS = {
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  background: "var(--background)",
  foreground: "var(--foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  destructive: "var(--destructive)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  landing: "var(--landing)",
  landingForeground: "var(--landing-foreground)",
} as const;

export const RADIUS = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
} as const;

export const SPACING = {
  section: "var(--spacing-section)",
  container: "var(--spacing-container)",
  card: "1.25rem",
  stack: "1rem",
  inline: "0.5rem",
} as const;

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;
