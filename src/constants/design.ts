export const COLORS = {
  primary: "hsl(262 83% 58%)",
  primaryForeground: "hsl(0 0% 100%)",
  background: "hsl(0 0% 100%)",
  foreground: "hsl(240 10% 3.9%)",
  muted: "hsl(240 4.8% 95.9%)",
  mutedForeground: "hsl(240 3.8% 46.1%)",
  border: "hsl(240 5.9% 90%)",
  destructive: "hsl(0 84.2% 60.2%)",
  landing: "hsl(240 10% 4%)",
  landingForeground: "hsl(0 0% 98%)",
} as const;

export const RADIUS = {
  sm: "calc(0.625rem - 4px)",
  md: "calc(0.625rem - 2px)",
  lg: "0.625rem",
  xl: "calc(0.625rem + 4px)",
  "2xl": "calc(0.625rem + 8px)",
} as const;

export const SPACING = {
  section: "2rem",
  container: "1.5rem",
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
